const ALLOWED_TAGS = new Set(['P', 'DIV', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'BLOCKQUOTE']);

const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

export function sanitizeRichText(value = '') {
  const source = String(value || '');
  if (typeof DOMParser === 'undefined') return source.replace(/<script[\s\S]*?<\/script>/gi, '');
  const documentNode = new DOMParser().parseFromString(`<div>${source}</div>`, 'text/html');
  const root = documentNode.body.firstElementChild;
  [...root.querySelectorAll('*')].forEach(node => {
    if (!ALLOWED_TAGS.has(node.tagName)) {
      node.replaceWith(...node.childNodes);
      return;
    }
    [...node.attributes].forEach(attribute => node.removeAttribute(attribute.name));
  });
  return root.innerHTML;
}

export function toRichTextHtml(value = '') {
  const source = String(value || '');
  if (/<\/?(?:p|div|br|strong|b|em|i|u|ul|ol|li|blockquote)\b/i.test(source)) return sanitizeRichText(source);
  return source ? escapeHtml(source).replace(/\r?\n/g, '<br>') : '';
}

export function richTextToPlainText(value = '') {
  const source = String(value || '');
  if (!source.includes('<')) return source;
  if (typeof DOMParser === 'undefined') return source.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|blockquote)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ');
  const documentNode = new DOMParser().parseFromString(`<div>${sanitizeRichText(source)}</div>`, 'text/html');
  documentNode.querySelectorAll('br').forEach(node => node.replaceWith(documentNode.createTextNode('\n')));
  documentNode.querySelectorAll('p,div,li,blockquote').forEach(node => node.append(documentNode.createTextNode('\n')));
  return documentNode.body.firstElementChild.textContent.replace(/\n{3,}/g, '\n\n').trim();
}

export const hasRichTextContent = value => richTextToPlainText(value).trim().length > 0;
export const countRichTextWords = value => richTextToPlainText(value).trim().split(/\s+/u).filter(Boolean).length;
