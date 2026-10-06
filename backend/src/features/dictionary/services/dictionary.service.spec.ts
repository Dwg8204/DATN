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

  it('calls only Azure and Wiktionary providers', async () => {
    fetchMock.mockImplementation(async input => {
      const url = String(input);
      if (url.includes('/dictionary/lookup')) return jsonResponse([{
        translations: [{ normalizedTarget: 'thử', displayTarget: 'thử', posTag: 'VERB', confidence: 1 }],
      }]);
      return wiktionary('===Pronunciation===', '* {{IPA|en|/tɛst/}}');
    });

    await service.lookup('test');

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.every(url => url.includes('microsofttranslator.com') || url.includes('wiktionary.org'))).toBe(true);
    expect(urls.some(url => /dictionaryapi|datamuse|tatoeba|mymemory/i.test(url))).toBe(false);
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
