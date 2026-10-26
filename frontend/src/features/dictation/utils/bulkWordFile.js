export const BULK_WORD_HEADERS = [
  'word', 'pronunciation', 'word_type', 'vietnamese_meaning', 'example_sentence', 'topic',
];

export const BULK_WORD_LIMIT = 500;
export const BULK_FILE_LIMIT = 5 * 1024 * 1024;

// Excel in some locales does not use a comma as its default CSV separator.
// The sep directive makes each header open in its own column without changing
// the six-column format accepted by the importer.
export const buildBulkWordCsvTemplate = () => `\uFEFFsep=,\r\n${BULK_WORD_HEADERS.join(',')}\r\n`;

export class BulkWordFileError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function splitCsv(text, delimiter) {
  const records = [];
  let record = [], cell = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell === '') quoted = true;
    else if (char === delimiter) { record.push(cell); cell = ''; }
    else if (char === '\r' || char === '\n') {
      record.push(cell); records.push(record); record = []; cell = '';
      if (char === '\r' && text[index + 1] === '\n') index += 1;
    } else cell += char;
  }
  if (quoted) throw new BulkWordFileError('csvFormat');
  if (record.length || cell) { record.push(cell); records.push(record); }
  return records;
}

function readCsv(text) {
  const content = text.replace(/^\uFEFF/, '').replace(/^sep=[,;]\r?\n/i, '');
  for (const delimiter of [',', ';']) {
    const records = splitCsv(content, delimiter);
    if (BULK_WORD_HEADERS.every((header, index) => records[0]?.[index] === header)
      && records[0].length === BULK_WORD_HEADERS.length) return records;
  }
  throw new BulkWordFileError('headers');
}

export async function parseBulkWordFile(file) {
  if (!file || !/\.(csv|xlsx)$/i.test(file.name)) throw new BulkWordFileError('fileType');
  if (!file.size || file.size > BULK_FILE_LIMIT) throw new BulkWordFileError('fileSize');
  const csv = /\.csv$/i.test(file.name);
  let values, sheet, XLSX;
  if (csv) {
    let value;
    try { value = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); }
    catch { throw new BulkWordFileError('encoding'); }
    values = readCsv(value);
  } else {
    XLSX = await import('xlsx');
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellFormula: true });
    if (workbook.SheetNames.length !== 1 || workbook.SheetNames[0] !== 'Words')
      throw new BulkWordFileError('sheet');
    sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet?.['!ref']) throw new BulkWordFileError('headers');
    const range = XLSX.utils.decode_range(sheet['!ref']);
    if (range.s.r !== 0 || range.s.c !== 0 || range.e.c !== BULK_WORD_HEADERS.length - 1)
      throw new BulkWordFileError('headers');
    if (range.e.r > 500) throw new BulkWordFileError('tooManyRows');
    values = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: true, raw: true });
    if (!BULK_WORD_HEADERS.every((header, index) => values[0]?.[index] === header))
      throw new BulkWordFileError('headers');
  }
  if (values.length > BULK_WORD_LIMIT + 1) throw new BulkWordFileError('tooManyRows');
  const rows = [];
  for (let index = 1; index < values.length; index += 1) {
    const cells = values[index] || [];
    if (cells.every(cell => cell === '' || cell == null)) continue;
    if (cells.length !== BULK_WORD_HEADERS.length) throw new BulkWordFileError('csvFormat');
    const row = { rowNumber: index + 1 };
    BULK_WORD_HEADERS.forEach((field, column) => {
      const cell = sheet?.[XLSX.utils.encode_cell({ r: index, c: column })];
      const value = cells[column];
      row[field] = cell?.f || (typeof value === 'string' && /^[=+@]/.test(value.trim()))
        ? null : value == null ? '' : value;
    });
    rows.push(row);
  }
  if (!rows.length) throw new BulkWordFileError('empty');
  if (rows.length > BULK_WORD_LIMIT) throw new BulkWordFileError('tooManyRows');
  return rows;
}

export function downloadBulkWordTemplate(format) {
  if (format !== 'csv') throw new BulkWordFileError('fileType');
  const blob = new Blob([buildBulkWordCsvTemplate()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vocabulary-import-template.${format}`;
  document.body.appendChild(link);
  try { link.click(); }
  finally { link.remove(); }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
