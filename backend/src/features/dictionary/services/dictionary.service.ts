import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationError } from '../../../common/errors/application.error';

type DictionaryMeaning = {
  partOfSpeech: string;
  definitions: Array<{ definition: string; example?: string }>;
  synonyms: string[];
  antonyms: string[];
};
type DictionaryEntry = {
  word: string;
  phonetic: string;
  phonetics: Array<{ text: string; audio: string }>;
  meanings: DictionaryMeaning[];
};
type CompactTranslation = { partOfSpeech: string; terms: string[] };
type DictionaryResponse = { entries: DictionaryEntry[]; translations: CompactTranslation[]; examples: string[] };
type CacheEntry = { expiresAt: number; value: DictionaryResponse };
type ExamplePair = { source: string; target: string };
type ProviderData = {
  translations: CompactTranslation[];
  synonyms: Map<string, string[]>;
  phonetic: string | null;
  examplePair: ExamplePair | null;
  examples: string[];
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
const MAX_CACHE_ENTRIES = 500;
const WIKTIONARY_TIMEOUT_MS = 1_500;
const AZURE_EXAMPLES_TIMEOUT_MS = 1_500;
const ENGLISH_DICTIONARY_TIMEOUT_MS = 1_800;
const SUPPORTED_PARTS = new Set([
  'noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction',
  'pronoun', 'interjection', 'determiner', 'numeral',
]);

@Injectable()
export class DictionaryService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly suggestionCache = new Map<string, { expiresAt: number; words: string[] }>();
  private readonly pendingSuggestions = new Map<string, Promise<{ words: string[]; unavailable: boolean }>>();
  private readonly pendingLookups = new Map<string, Promise<DictionaryResponse>>();

  constructor(private readonly config: ConfigService = new ConfigService()) {}

  async suggest(rawQuery: string): Promise<{ words: string[]; unavailable: boolean }> {
    const query = rawQuery.trim().toLowerCase();
    const cached = this.suggestionCache.get(query);
    if (cached && cached.expiresAt > Date.now()) return { words: cached.words, unavailable: false };
    const pending = this.pendingSuggestions.get(query);
    if (pending) return pending;
    const request = this.fetchSuggestions(query);
    this.pendingSuggestions.set(query, request);
    try { return await request; } finally { this.pendingSuggestions.delete(query); }
  }

  private async fetchSuggestions(query: string): Promise<{ words: string[]; unavailable: boolean }> {
    try {
      const params = new URLSearchParams({
        action: 'opensearch', search: query, namespace: '0', limit: '12',
        profile: 'fuzzy', redirects: 'resolve', format: 'json',
      });
      const response = await this.fetchJson(`https://en.wiktionary.org/w/api.php?${params}`, 2_500);
      if (!Array.isArray(response) || !Array.isArray(response[1])) throw new Error('Invalid suggestions');
      const words = [...new Set((response[1] as unknown[])
        .filter((word): word is string => typeof word === 'string' && word.length <= 60
          && /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(word))
        .map(word => word.toLowerCase()))].slice(0, 8);
      if (this.suggestionCache.size >= MAX_CACHE_ENTRIES) {
        this.suggestionCache.delete(this.suggestionCache.keys().next().value ?? '');
      }
      this.suggestionCache.set(query, { words, expiresAt: Date.now() + 10 * 60_000 });
      return { words, unavailable: false };
    } catch {
      return { words: [], unavailable: true };
    }
  }

  async lookup(rawWord: string, forceRefresh = false): Promise<DictionaryResponse> {
    const word = rawWord.trim().toLowerCase();
    if (forceRefresh) this.cache.delete(word);
    const cached = this.cache.get(word);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (cached) this.cache.delete(word);
    const pending = this.pendingLookups.get(word);
    if (pending) return pending;
    const request = this.resolveWord(word);
    this.pendingLookups.set(word, request);
    try { return await request; } finally { this.pendingLookups.delete(word); }
  }

  private async resolveWord(word: string): Promise<DictionaryResponse> {
    // Start examples as soon as Azure lookup finishes, not after all other providers.
    const azureRequest = this.azureDictionaryLookup(word);
    const examplesRequest = azureRequest.then(azure => azure.examplePair
      ? this.azureDictionaryExamples(azure.examplePair) : []);
    const [azure, wiktionary, english, azureExamples] = await Promise.all([
      azureRequest,
      this.wiktionaryLookup(word),
      this.englishDictionaryLookup(word),
      examplesRequest,
    ]);
    const translations = this.preferAzureTranslations(azure.translations, wiktionary.translations);
    if (!translations.length && !english.entries.length) {
      throw new ApplicationError('DICTIONARY_WORD_NOT_FOUND', `No dictionary entry was found for “${word}”.`, 404);
    }

    const examples = [...new Set([...azureExamples, ...english.examples, ...wiktionary.examples])].slice(0, 3);
    const synonyms = this.mergeSynonyms(word, azure.synonyms, wiktionary.synonyms);
    const meanings: DictionaryMeaning[] = translations.map(({ partOfSpeech }) => ({
      partOfSpeech,
      definitions: [],
      synonyms: synonyms.get(partOfSpeech) ?? [],
      antonyms: [],
    }));
    const phonetic = wiktionary.phonetic || english.phonetic;
    const entry: DictionaryEntry = {
      word,
      phonetic,
      phonetics: phonetic ? [{ text: phonetic, audio: '' }] : [],
      meanings: meanings.length ? meanings : english.entries[0]?.meanings ?? [],
    };
    const value = { entries: [entry], translations, examples };
    if (this.cache.size >= MAX_CACHE_ENTRIES) this.cache.delete(this.cache.keys().next().value ?? '');
    // Don't keep a provider outage / incomplete enrichment cached for a whole day.
    const complete = translations.length && phonetic && examples.length;
    this.cache.set(word, { expiresAt: Date.now() + (complete ? CACHE_TTL_MS : 5 * 60_000), value });
    return value;
  }

  private async englishDictionaryLookup(word: string): Promise<{
    entries: DictionaryEntry[]; phonetic: string; examples: string[];
  }> {
    const empty = { entries: [], phonetic: '', examples: [] };
    try {
      const response = await this.fetchJson(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
        ENGLISH_DICTIONARY_TIMEOUT_MS,
      );
      if (!Array.isArray(response)) return empty;
      const entries = (response as DictionaryEntry[]).filter(entry =>
        typeof entry?.word === 'string' && entry.word.trim().toLowerCase() === word
        && Array.isArray(entry.meanings));
      const phonetic = entries.flatMap(entry => [entry.phonetic, ...(entry.phonetics ?? []).map(item => item?.text)])
        .find(text => typeof text === 'string' && text.trim());
      const examples = [...new Set(entries.flatMap(entry => entry.meanings.flatMap(meaning =>
        (meaning.definitions ?? []).map(definition => definition?.example)))
        .filter((example): example is string => typeof example === 'string' && Boolean(example.trim()))
        .map(example => example.trim()))].slice(0, 3);
      return { entries, phonetic: phonetic ? `/${phonetic.trim().replace(/^[/\[]+|[/\]]+$/g, '')}/` : '', examples };
    } catch { return empty; }
  }

  private async azureDictionaryLookup(word: string): Promise<ProviderData> {
    const empty = this.emptyProviderData();
    if (!this.config.get<boolean>('dictionary.azureTranslator.enabled')) return empty;
    const key = this.config.get<string>('dictionary.azureTranslator.key');
    if (!key) return empty;
    const timeoutMs = Math.min(this.config.get<number>('dictionary.azureTranslator.timeoutMs') ?? 2_500, 3_000);

    try {
      const response = await this.fetchJson(
        `${this.azureEndpoint()}/dictionary/lookup?api-version=3.0&from=en&to=vi`,
        timeoutMs,
        { method: 'POST', headers: this.azureHeaders(key), body: JSON.stringify([{ text: word }]) },
      ) as Array<{
        normalizedSource?: string;
        translations?: Array<{
          normalizedTarget?: string;
          displayTarget?: string;
          posTag?: string;
          confidence?: number;
          backTranslations?: Array<{ normalizedText?: string; displayText?: string; numExamples?: number }>;
        }>;
      }>;
      const result = Array.isArray(response) ? response[0] : undefined;
      const rows = [...(result?.translations ?? [])]
        .sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0));
      const translations = new Map<string, string[]>();
      const synonyms = new Map<string, string[]>();
      let examplePair: ExamplePair | null = null;

      for (const row of rows) {
        const partOfSpeech = this.normalizeAzurePartOfSpeech(row.posTag);
        const term = row.displayTarget?.trim();
        if (term) this.addUnique(translations, partOfSpeech, term, 3, 'vi');
        for (const backTranslation of row.backTranslations ?? []) {
          const synonym = backTranslation.displayText?.trim() || backTranslation.normalizedText?.trim();
          if (synonym) this.addUnique(synonyms, partOfSpeech, synonym, 16, 'en');
          const source = backTranslation.normalizedText?.trim() || result?.normalizedSource?.trim() || word;
          if (!examplePair && source.toLowerCase() === word && (backTranslation.numExamples ?? 0) > 0 && row.normalizedTarget) {
            examplePair = {
              source,
              target: row.normalizedTarget,
            };
          }
        }
      }
      // Some Azure entries omit backTranslations/numExamples, but still support examples.
      if (!examplePair) {
        const target = rows.find(row => row.normalizedTarget)?.normalizedTarget;
        if (target) examplePair = { source: word, target };
      }
      return { translations: this.mapTranslations(translations), synonyms, phonetic: null, examplePair, examples: [] };
    } catch {
      return empty;
    }
  }

  private async azureDictionaryExamples(pair: ExamplePair): Promise<string[]> {
    const key = this.config.get<string>('dictionary.azureTranslator.key');
    if (!key) return [];
    try {
      const response = await this.fetchJson(
        `${this.azureEndpoint()}/dictionary/examples?api-version=3.0&from=en&to=vi`,
        AZURE_EXAMPLES_TIMEOUT_MS,
        {
          method: 'POST',
          headers: this.azureHeaders(key),
          body: JSON.stringify([{ text: pair.source, translation: pair.target }]),
        },
      ) as Array<{ examples?: Array<{ sourcePrefix?: string; sourceTerm?: string; sourceSuffix?: string }> }>;
      const rows = Array.isArray(response) ? response[0]?.examples ?? [] : [];
      return [...new Set(rows.map(row => (
        `${row.sourcePrefix ?? ''}${row.sourceTerm ?? ''}${row.sourceSuffix ?? ''}`.trim()
      )).filter(Boolean))].slice(0, 3);
    } catch {
      return [];
    }
  }

  private async wiktionaryLookup(word: string): Promise<ProviderData> {
    const pages = [word, `${word}/translations`];
    const responses = await Promise.allSettled(pages.map(page => this.fetchJson(
      `https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2&origin=*`,
      WIKTIONARY_TIMEOUT_MS,
    )));
    const translations = new Map<string, string[]>();
    const synonyms = new Map<string, string[]>();
    let phonetic: string | null = null;
    const examples = new Set<string>();

    for (const response of responses) {
      if (response.status !== 'fulfilled') continue;
      const parsed = response.value as { parse?: { wikitext?: string | { '*': string } } };
      const raw = parsed.parse?.wikitext;
      const english = this.englishSection(typeof raw === 'string' ? raw : raw?.['*'] ?? '');
      if (!english) continue;
      phonetic ??= this.parseWiktionaryPhonetic(english);
      this.collectWiktionaryTranslations(english, translations);
      this.collectWiktionarySynonyms(english, synonyms);
      for (const example of this.parseWiktionaryExamples(english)) examples.add(example);
    }
    return { translations: this.mapTranslations(translations), synonyms, phonetic, examplePair: null,
      examples: [...examples].slice(0, 3) };
  }

  private parseWiktionaryExamples(english: string): string[] {
    const examples: string[] = [];
    for (const match of english.matchAll(/\{\{(?:ux|uxi|usex)\|en\|((?:[^{}]|\{\{[^{}]*\}\})+)\}\}/gi)) {
      const text = match[1]
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
        .replace(/\[\[([^\]]+)\]\]/g, '$1')
        .replace(/\{\{(?:l|m)\|en\|([^|}]+)(?:\|([^|}]+))?\}\}/gi, (_match, word: string, alt?: string) => alt || word)
        .split('|')[0]
        .replace(/'{2,5}/g, '').replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/g, "'")
        .trim();
      // Don't expose unresolved template markup as a student's example sentence.
      if (text && text.length <= 600 && !/[{}]/.test(text)) examples.push(text);
      if (examples.length === 3) break;
    }
    return examples;
  }

  private englishSection(wikitext: string): string {
    const start = wikitext.indexOf('==English==');
    if (start < 0) return '';
    const section = wikitext.slice(start + '==English=='.length);
    const nextLanguage = section.search(/\n==[^=\n]+==\s*(?:\n|$)/);
    return nextLanguage >= 0 ? section.slice(0, nextLanguage) : section;
  }

  private parseWiktionaryPhonetic(english: string): string | null {
    for (const match of english.matchAll(/\{\{IPA\|en\|([^}\n]+)/gi)) {
      const candidate = match[1].split('|').find(value => /[/[].+[/\]]/.test(value))?.trim();
      if (!candidate) continue;
      const normalized = candidate.replace(/^\[|\]$/g, '/').replace(/^\/+|\/+$/g, '');
      if (normalized) return `/${normalized}/`;
    }
    return null;
  }

  private collectWiktionaryTranslations(english: string, target: Map<string, string[]>): void {
    let partOfSpeech = '';
    for (const line of english.split(/\r?\n/)) {
      const heading = line.match(/^={3,5}\s*([^=]+?)\s*={3,5}$/)?.[1]?.trim().toLowerCase();
      if (heading && SUPPORTED_PARTS.has(heading)) partOfSpeech = heading;
      if (!partOfSpeech || !/^\*\s*Vietnamese\s*:/i.test(line)) continue;
      for (const match of line.matchAll(/\{\{(?:t\+?|tt\+?|t-check|t-simple|l)\|vi\|([^|}]+)/gi)) {
        const term = match[1].replace(/\[\[|\]\]/g, '').trim();
        if (term) this.addUnique(target, partOfSpeech, term, 3, 'vi');
      }
    }
  }

  private collectWiktionarySynonyms(english: string, target: Map<string, string[]>): void {
    let partOfSpeech = '';
    let inSynonyms = false;
    for (const line of english.split(/\r?\n/)) {
      const heading = line.match(/^={3,6}\s*([^=]+?)\s*={3,6}$/)?.[1]?.trim().toLowerCase();
      if (heading && SUPPORTED_PARTS.has(heading)) {
        partOfSpeech = heading;
        inSynonyms = false;
      } else if (heading) {
        inSynonyms = heading === 'synonyms';
      }
      if (!partOfSpeech || !inSynonyms) continue;
      for (const match of line.matchAll(/\{\{(?:syn|synonyms)\|en\|([^}]+)/gi)) {
        for (const raw of match[1].split('|')) {
          const synonym = raw.trim();
          if (synonym && !synonym.includes('=') && !synonym.startsWith('{')) {
            this.addUnique(target, partOfSpeech, synonym, 16, 'en');
          }
        }
      }
    }
  }

  private preferAzureTranslations(azure: CompactTranslation[], fallback: CompactTranslation[]): CompactTranslation[] {
    const grouped = new Map<string, string[]>();
    for (const item of azure) {
      for (const term of item.terms) this.addUnique(grouped, item.partOfSpeech, term, 3, 'vi');
    }
    for (const item of fallback) {
      if (grouped.has(item.partOfSpeech)) continue;
      for (const term of item.terms) this.addUnique(grouped, item.partOfSpeech, term, 3, 'vi');
    }
    return this.mapTranslations(grouped);
  }

  private mergeSynonyms(word: string, ...sources: Array<Map<string, string[]>>): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const source of sources) {
      for (const [partOfSpeech, words] of source) {
        for (const synonym of words) {
          if (synonym.localeCompare(word, 'en', { sensitivity: 'base' }) !== 0) {
            this.addUnique(result, partOfSpeech, synonym, 20, 'en');
          }
        }
      }
    }
    return result;
  }

  private addUnique(
    target: Map<string, string[]>, key: string, value: string, limit: number, locale: string,
  ): void {
    value = value.trim().normalize('NFC');
    // Wiktionary's `vi` entries can also contain historical Han/Nom spellings.
    // This app's Vietnamese meaning field uses modern Latin-script Quoc ngu only.
    if (locale === 'vi' && (!/\p{L}/u.test(value)
      || /[^\p{Script=Latin}\p{M}\p{N}\p{P}\p{Zs}]/u.test(value))) return;
    const values = target.get(key) ?? [];
    if (values.length >= limit) return;
    if (!values.some(current => current.localeCompare(value, locale, { sensitivity: 'base' }) === 0)) {
      values.push(value);
      target.set(key, values);
    }
  }

  private mapTranslations(source: Map<string, string[]>): CompactTranslation[] {
    return [...source].filter(([, terms]) => terms.length).map(([partOfSpeech, terms]) => ({ partOfSpeech, terms }));
  }

  private normalizeAzurePartOfSpeech(value?: string): string {
    const key = value?.trim().toUpperCase() ?? '';
    return ({
      ADJ: 'adjective', ADV: 'adverb', CONJ: 'conjunction', DET: 'determiner', MODAL: 'verb',
      NOUN: 'noun', PREP: 'preposition', PRON: 'pronoun', VERB: 'verb', OTHER: 'word',
    } as Record<string, string>)[key] ?? 'word';
  }

  private azureEndpoint(): string {
    return (this.config.get<string>('dictionary.azureTranslator.endpoint')
      ?? 'https://api.cognitive.microsofttranslator.com').replace(/\/$/, '');
  }

  private azureHeaders(key: string): Record<string, string> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'ocp-apim-subscription-key': key,
    };
    const region = this.config.get<string>('dictionary.azureTranslator.region');
    if (region) headers['ocp-apim-subscription-region'] = region;
    return headers;
  }

  private emptyProviderData(): ProviderData {
    return { translations: [], synonyms: new Map(), phonetic: null, examplePair: null, examples: [] };
  }

  private async fetchJson(url: string, timeoutMs: number, init: RequestInit = {}): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: { accept: 'application/json', 'user-agent': 'AptiMate/1.0', ...init.headers },
      });
      if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
      return await response.json() as unknown;
    } finally {
      clearTimeout(timeout);
    }
  }
}
