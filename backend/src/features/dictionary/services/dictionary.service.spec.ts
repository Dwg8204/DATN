import { ConfigService } from '@nestjs/config';
import { DictionaryService } from './dictionary.service';

const jsonResponse = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: jest.fn().mockResolvedValue(body),
}) as unknown as Response;

const wiktionary = (...lines: string[]) => jsonResponse({
  parse: { wikitext: ['==English==', ...lines, '==French=='].join('\n') },
});

const configuredService = () => new DictionaryService(new ConfigService({
  dictionary: { azureTranslator: {
    enabled: true,
    key: 'azure-key',
    region: 'eastasia',
    endpoint: 'https://api.cognitive.microsofttranslator.com',
    timeoutMs: 2500,
  } },
}));

describe('DictionaryService', () => {
  let service: DictionaryService;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    service = configuredService();
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => jest.restoreAllMocks());

  it('returns safe, unique fuzzy word suggestions and caches successful requests', async () => {
    fetchMock.mockResolvedValue(jsonResponse(['achiev', [
      'achieve', 'achievement', 'Achieve', 'achievement/translations', '<script>', 123,
    ], [], []]));

    expect(await service.suggest(' Achiev ')).toEqual({ words: ['achieve', 'achievement'], unavailable: false });
    expect(await service.suggest('achiev')).toEqual({ words: ['achieve', 'achievement'], unavailable: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get('search')).toBe('achiev');
    expect(url.searchParams.get('profile')).toBe('fuzzy');
  });

  it('reports unavailable suggestions without poisoning the cache', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce(jsonResponse(['effec', ['effective'], [], []]));

    expect(await service.suggest('effec')).toEqual({ words: [], unavailable: true });
    expect(await service.suggest('effec')).toEqual({ words: ['effective'], unavailable: false });
  });

  it('distinguishes an empty result from an upstream failure', async () => {
    fetchMock.mockResolvedValue(jsonResponse(['unknownword', [], [], []]));
    expect(await service.suggest('unknownword')).toEqual({ words: [], unavailable: false });
  });

  it('uses Azure for meanings/examples and Wiktionary for IPA and synonyms', async () => {
    fetchMock.mockImplementation(async input => {
      const url = String(input);
      if (url.includes('/dictionary/lookup')) return jsonResponse([{
        normalizedSource: 'book',
        translations: [
          {
            normalizedTarget: 'sách', displayTarget: 'sách', posTag: 'NOUN', confidence: 0.99,
            backTranslations: [
              { normalizedText: 'book', displayText: 'book', numExamples: 4 },
              { normalizedText: 'volume', displayText: 'volume', numExamples: 1 },
            ],
          },
          {
            normalizedTarget: 'đặt', displayTarget: 'đặt', posTag: 'VERB', confidence: 0.9,
            backTranslations: [{ normalizedText: 'reserve', displayText: 'reserve', numExamples: 2 }],
          },
        ],
      }]);
      if (url.includes('/dictionary/examples')) return jsonResponse([{
        examples: [{ sourcePrefix: 'I read a ', sourceTerm: 'book', sourceSuffix: ' every week.' }],
      }]);
      if (url.includes('page=book%2Ftranslations')) return wiktionary(
        '===Noun===', '* Vietnamese: {{t+|vi|quyển sách}}',
        '===Verb===', '* Vietnamese: {{t+|vi|đặt chỗ}}',
      );
      return wiktionary(
        '===Pronunciation===', '* {{IPA|en|/bʊk/|/buːk/}}',
        '===Noun===', '====Synonyms====', '* {{syn|en|volume|publication}}',
        '===Verb===', '====Synonyms====', '* {{syn|en|reserve|schedule}}',
      );
    });

    const result = await service.lookup('book');

    expect(result.translations).toEqual([
      { partOfSpeech: 'noun', terms: ['sách'] },
      { partOfSpeech: 'verb', terms: ['đặt'] },
    ]);
    expect(result.entries[0].phonetic).toBe('/bʊk/');
    expect(result.entries[0].meanings.find(item => item.partOfSpeech === 'noun')?.synonyms)
      .toEqual(expect.arrayContaining(['volume', 'publication']));
    expect(result.entries[0].meanings.find(item => item.partOfSpeech === 'verb')?.synonyms)
      .toEqual(expect.arrayContaining(['reserve', 'schedule']));
    expect(result.examples).toEqual(['I read a book every week.']);
  });

  it('falls back to Wiktionary Vietnamese meanings when Azure fails', async () => {
    fetchMock.mockImplementation(async input => {
      const url = String(input);
      if (url.includes('/dictionary/lookup')) return jsonResponse({}, false, 429);
      if (url.includes('page=friend%2Ftranslations')) return wiktionary(
        '===Noun===', '* Vietnamese: {{t+|vi|người bạn}}',
      );
      return wiktionary('===Pronunciation===', '* {{IPA|en|/fɹɛnd/}}');
    });

    const result = await service.lookup('friend');

    expect(result.translations).toEqual([{ partOfSpeech: 'noun', terms: ['người bạn'] }]);
    expect(result.entries[0].phonetic).toBe('/fɹɛnd/');
  });

  it('uses Wiktionary only to fill a part of speech missing from Azure', async () => {
    fetchMock.mockImplementation(async input => {
      const url = String(input);
      if (url.includes('/dictionary/lookup')) return jsonResponse([{
        normalizedSource: 'book',
        translations: [{ normalizedTarget: 'sách', displayTarget: 'sách', posTag: 'NOUN', confidence: 1 }],
      }]);
      if (url.includes('page=book%2Ftranslations')) return wiktionary(
        '===Noun===', '* Vietnamese: {{t+|vi|quyển sách}}',
        '===Verb===', '* Vietnamese: {{t+|vi|đặt}}',
      );
      return wiktionary('===Pronunciation===', '* {{IPA|en|/bʊk/}}');
    });

    const result = await service.lookup('book');

    expect(result.translations).toEqual([
      { partOfSpeech: 'noun', terms: ['sách'] },
      { partOfSpeech: 'verb', terms: ['đặt'] },
    ]);
  });

  it('uses only the configured dictionary providers, including English enrichment', async () => {
    fetchMock.mockImplementation(async input => {
      const url = String(input);
      if (url.includes('/dictionary/lookup')) return jsonResponse([{
        translations: [{ normalizedTarget: 'thử', displayTarget: 'thử', posTag: 'VERB', confidence: 1 }],
      }]);
      return wiktionary('===Pronunciation===', '* {{IPA|en|/tɛst/}}');
    });

    await service.lookup('test');

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.every(url => url.includes('microsofttranslator.com') || url.includes('wiktionary.org')
      || url.includes('api.dictionaryapi.dev'))).toBe(true);
    expect(urls.some(url => /datamuse|tatoeba|mymemory/i.test(url))).toBe(false);
  });

  it('fills missing IPA from phonetics and examples from English definitions', async () => {
    fetchMock.mockImplementation(async input => {
      const url = String(input);
      if (url.includes('api.dictionaryapi.dev')) return jsonResponse([{
        word: 'friend', phonetics: [{ audio: '' }, { text: '/frend/' }],
        meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'A companion.', example: 'She is my best friend.' }] }],
      }]);
      if (url.includes('/dictionary/lookup')) return jsonResponse([{
        translations: [{ normalizedTarget: 'bạn', displayTarget: 'bạn', posTag: 'NOUN' }],
      }]);
      if (url.includes('/dictionary/examples')) return jsonResponse([{ examples: [] }]);
      return wiktionary('===Noun===');
    });
    const result = await service.lookup('friend');
    expect(result.entries[0].phonetic).toBe('/frend/');
    expect(result.examples).toEqual(['She is my best friend.']);
    expect(result.translations[0].terms).toEqual(['bạn']);
  });

  it('retrieves Azure examples even when backTranslations are omitted', async () => {
    fetchMock.mockImplementation(async input => {
      const url = String(input);
      if (url.includes('/dictionary/lookup')) return jsonResponse([{
        translations: [{ normalizedTarget: 'bạn', displayTarget: 'bạn', posTag: 'NOUN' }],
      }]);
      if (url.includes('/dictionary/examples')) return jsonResponse([{
        examples: [{ sourcePrefix: 'He is a good ', sourceTerm: 'friend', sourceSuffix: '.' }],
      }]);
      return wiktionary('===Noun===');
    });
    expect((await service.lookup('friend')).examples).toEqual(['He is a good friend.']);
    const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/dictionary/examples'));
    expect(JSON.parse(String(call?.[1]?.body))).toEqual([{ text: 'friend', translation: 'bạn' }]);
  });

  it('does not retrieve examples for a different back-translated synonym', async () => {
    fetchMock.mockImplementation(async input => {
      const url = String(input);
      if (url.includes('/dictionary/lookup')) return jsonResponse([{
        translations: [{ normalizedTarget: 'đặt', displayTarget: 'đặt', posTag: 'VERB',
          backTranslations: [{ normalizedText: 'reserve', numExamples: 2 }] }],
      }]);
      if (url.includes('/dictionary/examples')) return jsonResponse([{ examples: [] }]);
      return wiktionary('===Verb===');
    });
    await service.lookup('book');
    const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/dictionary/examples'));
    expect(JSON.parse(String(call?.[1]?.body))).toEqual([{ text: 'book', translation: 'đặt' }]);
  });

  it('an English provider failure does not break existing Azure/Wiktionary results', async () => {
    fetchMock.mockImplementation(async input => {
      const url = String(input);
      if (url.includes('api.dictionaryapi.dev')) throw new Error('Unavailable');
      if (url.includes('/dictionary/lookup')) return jsonResponse([{
        translations: [{ normalizedTarget: 'sách', displayTarget: 'sách', posTag: 'NOUN' }],
      }]);
      if (url.includes('/dictionary/examples')) return jsonResponse([{ examples: [] }]);
      return wiktionary('===Pronunciation===', '* {{IPA|en|/bʊk/}}');
    });
    const result = await service.lookup('book');
    expect(result.entries[0].phonetic).toBe('/bʊk/');
    expect(result.translations[0].terms).toEqual(['sách']);
  });

  it('fills example sentences from Wiktionary when other example providers return nothing', async () => {
    fetchMock.mockImplementation(async input => {
      const url = String(input);
      if (url.includes('/dictionary/lookup')) return jsonResponse([{
        translations: [{ normalizedTarget: 'ứng viên', displayTarget: 'ứng viên', posTag: 'NOUN' }],
      }]);
      if (url.includes('/dictionary/examples')) return jsonResponse([{ examples: [] }]);
      if (url.includes('api.dictionaryapi.dev')) return jsonResponse([], false, 404);
      return wiktionary('===Noun===',
        "#: {{ux|en|She is a '''candidate''' for the [[job|position]].}}",
        '#: {{ux|en|The {{l|en|candidate}} arrived early.|Ứng viên đến sớm.}}',
        '#: {{ux|en|{{unknown-template|bad}}}}');
    });
    expect((await service.lookup('candidate')).examples).toEqual([
      'She is a candidate for the position.', 'The candidate arrived early.',
    ]);
  });

  it('excludes Han/Nom entries tagged vi while preserving Vietnamese Quoc ngu', async () => {
    fetchMock.mockImplementation(async input => {
      const url = String(input);
      if (url.includes('/dictionary/lookup')) return jsonResponse([], false, 503);
      if (url.includes('api.dictionaryapi.dev')) return jsonResponse([], false, 404);
      return wiktionary('===Noun===',
        '* Chinese: {{t|zh|教师}}',
        '* Vietnamese: {{t+|vi|giáo viên}} ({{t|vi|教員}}), {{t+|vi|cô giáo}} {{q|female}}',
        '* Vietnamese: {{t|vi|thầy giáo}}');
    });
    const result = await service.lookup('teacher');
    expect(result.translations).toEqual([{ partOfSpeech: 'noun', terms: ['giáo viên', 'cô giáo', 'thầy giáo'] }]);
  });

  it('filters non-Latin Azure translations and normalizes decomposed Vietnamese accents', async () => {
    fetchMock.mockImplementation(async input => {
      const url = String(input);
      if (url.includes('/dictionary/lookup')) return jsonResponse([{
        translations: [
          { normalizedTarget: '教师', displayTarget: '教师', posTag: 'NOUN' },
          { normalizedTarget: 'giáo viên', displayTarget: 'giáo viên'.normalize('NFD'), posTag: 'NOUN' },
          { normalizedTarget: '선생님', displayTarget: '선생님', posTag: 'NOUN' },
          { normalizedTarget: 'thầy giáo', displayTarget: 'thầy giáo', posTag: 'NOUN' },
        ],
      }]);
      if (url.includes('/dictionary/examples')) return jsonResponse([{ examples: [] }]);
      return wiktionary('===Noun===');
    });
    expect((await service.lookup('teacher')).translations).toEqual([
      { partOfSpeech: 'noun', terms: ['giáo viên', 'thầy giáo'] },
    ]);
  });

  it('coalesces simultaneous requests for the same suggestion query', async () => {
    fetchMock.mockResolvedValue(jsonResponse(['fr', ['friend'], [], []]));
    const results = await Promise.all([service.suggest('fr'), service.suggest(' FR ')]);
    expect(results[0]).toEqual(results[1]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('coalesces simultaneous word lookups', async () => {
    fetchMock.mockImplementation(async input => {
      const url = String(input);
      if (url.includes('/dictionary/lookup')) return jsonResponse([{
        translations: [{ normalizedTarget: 'bạn', displayTarget: 'bạn', posTag: 'NOUN' }],
      }]);
      if (url.includes('/dictionary/examples')) return jsonResponse([{ examples: [] }]);
      return wiktionary('===Pronunciation===', '* {{IPA|en|/frend/}}');
    });
    const results = await Promise.all([service.lookup('friend'), service.lookup(' FRIEND ')]);
    expect(results[0]).toEqual(results[1]);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/dictionary/lookup'))).toHaveLength(1);
  });

  it('caches the completed lookup and supports an explicit refresh', async () => {
    fetchMock.mockImplementation(async input => {
      const url = String(input);
      if (url.includes('/dictionary/lookup')) return jsonResponse([{
        translations: [{ normalizedTarget: 'sách', displayTarget: 'sách', posTag: 'NOUN', confidence: 1 }],
      }]);
      return wiktionary('===Pronunciation===', '* {{IPA|en|/bʊk/}}');
    });

    await service.lookup('book');
    const initialCalls = fetchMock.mock.calls.length;
    await service.lookup('book');
    expect(fetchMock).toHaveBeenCalledTimes(initialCalls);
    await service.lookup('book', true);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(initialCalls);
  });
});
