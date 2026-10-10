const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const isPreviewableWordDocument = (fileType, fileName = '') =>
  fileType === DOCX_MIME || /\.docx$/i.test(fileName);

const SPREADSHEET_MIMES = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export const isPreviewableSpreadsheet = (fileType, fileName = '') =>
  SPREADSHEET_MIMES.has(fileType) || /\.(xlsx|xls)$/i.test(fileName);

export const isPreviewablePowerPoint = (fileType, fileName = '') =>
  fileType === PPTX_MIME || /\.pptx$/i.test(fileName);
