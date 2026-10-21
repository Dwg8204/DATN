export const BULK_WORD_TYPES = [
  'noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun',
  'determiner', 'conjunction', 'interjection', 'phrase', 'phrasal verb',
] as const;

export type BulkWordRow = {
  rowNumber: number;
  word: string;
  pronunciation: string;
  word_type: string;
  vietnamese_meaning: string;
  example_sentence: string;
  topic: string;
};
export type BulkRowPreview = {
  rowNumber: number;
  word: string;
  topic: string;
  status: 'ready' | 'duplicate' | 'error';
  folder: 'existing' | 'new' | null;
  errors: { field: string; message: string }[];
};

export const bulkKey = (value: string) => value.trim().replace(/\s+/g, ' ').normalize('NFKC').toLowerCase();
const latinText = (value: string) => /\p{Script=Latin}/u.test(value)
  && !/[^\p{Script=Latin}\p{M}\p{N}\p{P}\p{Zs}]/u.test(value);
const allowedFields = ['rowNumber', 'word', 'pronunciation', 'word_type', 'vietnamese_meaning', 'example_sentence', 'topic'];

export function analyzeBulkWords(rawRows: unknown[], folders: { id: string; name: string }[],
  savedWords: { folder_id: string; word: string }[]) {
  const folderByName = new Map<string, { id: string; name: string }>();
  for (const folder of folders) if (!folderByName.has(bulkKey(folder.name))) folderByName.set(bulkKey(folder.name), folder);
  const existing = new Set(savedWords.map(item => `${item.folder_id}:${bulkKey(item.word)}`));
  const seen = new Set<string>();
  const newFolders = new Map<string, string>();
  const rows: BulkRowPreview[] = [];
  const readyRows: BulkWordRow[] = [];
  const seenRowNumbers = new Set<number>();
  rawRows.forEach((raw, index) => {
    const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
    const rowNumber = Number.isInteger(input.rowNumber) && Number(input.rowNumber) >= 2 && Number(input.rowNumber) <= 501
      ? Number(input.rowNumber) : index + 2;
    const errors: BulkRowPreview['errors'] = [];
    if (!Number.isInteger(input.rowNumber) || input.rowNumber !== rowNumber || seenRowNumbers.has(rowNumber))
      errors.push({ field: 'rowNumber', message: 'Invalid or repeated row number.' });
    seenRowNumbers.add(rowNumber);
    for (const field of Object.keys(input)) if (!allowedFields.includes(field))
      errors.push({ field, message: 'Unexpected column.' });
    const fields: Record<string, string> = {};
    for (const field of allowedFields.slice(1)) {
      if (typeof input[field] !== 'string') errors.push({ field, message: 'This cell must contain text.' });
      fields[field] = typeof input[field] === 'string' ? input[field].normalize('NFC').trim() : '';
    }
    for (const [field, limit] of Object.entries({ word: 255, pronunciation: 255, word_type: 50,
      vietnamese_meaning: 5000, example_sentence: 5000, topic: 40 })) {
      if (fields[field].length > limit) errors.push({ field, message: `Maximum ${limit} characters.` });
      if (field !== 'example_sentence' && !fields[field]) errors.push({ field, message: 'This cell is required.' });
    }
    fields.topic = fields.topic.replace(/\s+/g, ' ');
    fields.word = fields.word.replace(/\s+/g, ' ');
    fields.word_type = fields.word_type.toLowerCase();
    if (fields.word && !/^[\p{Script=Latin}\p{M}\p{N}][\p{Script=Latin}\p{M}\p{N} '-]*$/u.test(fields.word))
      errors.push({ field: 'word', message: 'Enter an English word or phrase.' });
    if (fields.word_type && !BULK_WORD_TYPES.includes(fields.word_type as typeof BULK_WORD_TYPES[number]))
      errors.push({ field: 'word_type', message: 'Unsupported word type.' });
    if (fields.vietnamese_meaning && !latinText(fields.vietnamese_meaning))
      errors.push({ field: 'vietnamese_meaning', message: 'Enter a Vietnamese meaning without other scripts.' });
    if (fields.example_sentence && !latinText(fields.example_sentence))
      errors.push({ field: 'example_sentence', message: 'Enter an English example sentence.' });
    const folder = folderByName.get(bulkKey(fields.topic));
    const key = `${folder?.id ?? `new:${bulkKey(fields.topic)}`}:${bulkKey(fields.word)}`;
    const duplicate = !errors.length && (existing.has(key) || seen.has(key));
    const status = errors.length ? 'error' : duplicate ? 'duplicate' : 'ready';
    if (status === 'ready') {
      seen.add(key);
      readyRows.push({ rowNumber, word: fields.word, pronunciation: fields.pronunciation,
        word_type: fields.word_type, vietnamese_meaning: fields.vietnamese_meaning,
        example_sentence: fields.example_sentence, topic: folder?.name ?? fields.topic });
      if (!folder) newFolders.set(bulkKey(fields.topic), fields.topic);
    }
    rows.push({ rowNumber, word: fields.word, topic: folder?.name ?? fields.topic, status,
      folder: fields.topic && !errors.some(error => error.field === 'topic') ? folder ? 'existing' : 'new' : null, errors });
  });
  return { rows, readyRows, newFolders: [...newFolders.values()],
    counts: { ready: readyRows.length, duplicate: rows.filter(row => row.status === 'duplicate').length,
      error: rows.filter(row => row.status === 'error').length } };
}
