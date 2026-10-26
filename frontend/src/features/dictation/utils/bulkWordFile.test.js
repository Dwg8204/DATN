import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import XLSX from 'xlsx';
import { BULK_WORD_HEADERS, buildBulkWordCsvTemplate, parseBulkWordFile } from './bulkWordFile.js';

const file = (name, content) => Object.assign(new Blob([content]), { name });

test('CSV accepts UTF-8 Vietnamese and an empty example sentence', async () => {
  const csv = `\uFEFF${BULK_WORD_HEADERS.join(',')}\nmake,/meɪk/,verb,làm,,Daily life\n`;
  const rows = await parseBulkWordFile(file('words.csv', csv));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].rowNumber, 2);
  assert.equal(rows[0].vietnamese_meaning, 'làm');
  assert.equal(rows[0].example_sentence, '');
});

test('downloaded CSV template opens as six separate Excel columns and is accepted when filled', async () => {
  const template = buildBulkWordCsvTemplate();
  assert.ok(template.startsWith('\uFEFFsep=,\r\n'));
  const workbook = XLSX.read(template.replace(/^\uFEFF/, ''), { type: 'string' });
  const header = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 })[0];
  assert.deepEqual(header, BULK_WORD_HEADERS);
  const rows = await parseBulkWordFile(file('filled-template.csv', `${template}make,/meɪk/,verb,làm,,Daily life\r\n`));
  assert.equal(rows[0].word, 'make');
  assert.equal(rows[0].topic, 'Daily life');
});

test('served Excel template is a real xlsx workbook with six separate columns', async () => {
  const bytes = await readFile(new URL('../../../../public/templates/vocabulary-import-template.xlsx', import.meta.url));
  const workbook = XLSX.read(bytes, { type: 'buffer' });
  assert.deepEqual(workbook.SheetNames, ['Words']);
  assert.deepEqual(XLSX.utils.sheet_to_json(workbook.Sheets.Words, { header: 1 })[0], BULK_WORD_HEADERS);
});

test('filled Excel template is accepted with Vietnamese text and an optional example', async () => {
  const bytes = await readFile(new URL('../../../../public/templates/vocabulary-import-template.xlsx', import.meta.url));
  const workbook = XLSX.read(bytes, { type: 'buffer' });
  XLSX.utils.sheet_add_aoa(workbook.Sheets.Words, [['meticulous', '/məˈtɪk.jə.ləs/', 'Adjective', 'Tỉ mỉ, kỹ lưỡng', '', 'Work']], { origin: 'A2' });
  const filled = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const rows = await parseBulkWordFile(file('vocabulary-import-template (1).xlsx', filled));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].word, 'meticulous');
  assert.equal(rows[0].vietnamese_meaning, 'Tỉ mỉ, kỹ lưỡng');
  assert.equal(rows[0].example_sentence, '');
});

test('CSV row with a comma in Vietnamese meaning and capitalized type parses into six fields', async () => {
  const csv = `${buildBulkWordCsvTemplate()}accomplish,/əˈkʌm.plɪʃ/,Verb,"Hoàn thành, đạt được","Hoàn thành, đạt được",Education\r\n`;
  const [row] = await parseBulkWordFile(file('vocabulary-import-template (7).csv', csv));
  assert.equal(row.word, 'accomplish');
  assert.equal(row.word_type, 'Verb');
  assert.equal(row.vietnamese_meaning, 'Hoàn thành, đạt được');
  assert.equal(row.example_sentence, 'Hoàn thành, đạt được');
  assert.equal(row.topic, 'Education');
});

test('CSV saved with a semicolon separator by Excel still matches the fixed columns', async () => {
  const csv = `\uFEFFsep=;\r\n${BULK_WORD_HEADERS.join(';')}\r\naccomplish;/əˈkʌm.plɪʃ/;Verb;Hoàn thành, đạt được;;Education\r\n`;
  const [row] = await parseBulkWordFile(file('saved-from-excel.csv', csv));
  assert.equal(row.vietnamese_meaning, 'Hoàn thành, đạt được');
  assert.equal(row.example_sentence, '');
  assert.equal(row.topic, 'Education');
});

test('CSV handles quoted line breaks and reports malformed columns precisely', async () => {
  const csv = `${buildBulkWordCsvTemplate()}make,/meɪk/,verb,làm,"I make\r\nprogress.",Daily life\r\n`;
  const [row] = await parseBulkWordFile(file('quoted.csv', csv));
  assert.equal(row.example_sentence, 'I make\r\nprogress.');
  await assert.rejects(parseBulkWordFile(file('broken.csv', `${buildBulkWordCsvTemplate()}make,/meɪk/,verb,làm,one,two,extra\r\n`)), { code: 'csvFormat' });
});

test('wrong columns are rejected before API preview', async () => {
  await assert.rejects(parseBulkWordFile(file('words.csv', 'word,topic\nmake,Daily life\n')), { code: 'headers' });
});

test('Excel requires Words sheet and rejects formulas', async () => {
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([BULK_WORD_HEADERS, ['make', '/meɪk/', 'verb', 'làm', '', 'Daily life']]);
  sheet.F2 = { t: 'n', f: '1+1', v: 2 };
  XLSX.utils.book_append_sheet(wb, sheet, 'Words');
  const rows = await parseBulkWordFile(file('words.xlsx', XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })));
  assert.equal(rows[0].topic, null, 'formula cannot be submitted as a folder name');
});
