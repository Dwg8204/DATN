const text = value => typeof value === 'string' ? value.trim() : '';

export function dictionaryVietnameseTranslations(data) {
  return (data?.translations ?? []).map(item => ({ ...item, terms: [...new Set((item.terms ?? [])
    .map(value => text(value).normalize('NFC'))
    .filter(value => /\p{L}/u.test(value) && !/[^\p{Script=Latin}\p{M}\p{N}\p{P}\p{Zs}]/u.test(value)))] }))
    .filter(item => item.terms.length);
}

// Only dictionary translations (not English definitions) can fill Vietnamese meaning.
export function dictionaryWordItem(word, data) {
  const translations = dictionaryVietnameseTranslations(data);
  const terms = [...new Set(translations.flatMap(item => item.terms))];
  const entries = data?.entries ?? [];
  const definitions = entries.flatMap(entry => (entry.meanings ?? []).flatMap(item => item.definitions ?? []));
  return {
    kind: 'WORD', word: text(word).toLowerCase(), meaning: terms.join('; ').slice(0, 5000),
    pronunciation: entries.flatMap(entry => [entry.phonetic, ...(entry.phonetics ?? []).map(item => item.text)])
      .map(text).find(Boolean)?.slice(0, 255) ?? '',
    type: text(translations.find(item => item.terms?.length)?.partOfSpeech || entries[0]?.meanings?.[0]?.partOfSpeech).slice(0, 50),
    example: [...(data?.examples ?? []), ...definitions.map(item => item.example)]
      .map(text).find(Boolean)?.slice(0, 5000) ?? '',
  };
}

export const DEFAULT_VOCABULARY_FOLDER = 'My vocabulary';
export const hasDictionaryWord = (words, folderId, word) => words.some(item =>
  item.folderId === folderId && text(item.word).toLowerCase() === text(word).toLowerCase());
