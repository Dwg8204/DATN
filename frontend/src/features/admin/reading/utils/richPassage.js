const GAP_PATTERN = /\[(\d+)\]/g;
const GAP_HTML_PATTERN = /<span[^>]*data-gap=["'](\d+)["'][^>]*>.*?<\/span>/gi;
const allowedTags = new Set(['P','DIV','BR','BLOCKQUOTE','STRONG','B','EM','I','U','SPAN']);

const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

export function legacyPassageToHtml(passage = '') {
  return escapeHtml(passage).replace(/\r?\n/g, '<br>').replace(GAP_PATTERN, (_, number) => `<span data-gap="${number}" contenteditable="false">Gap ${number}</span>`);
}

export function sanitizePassageHtml(value = '') {
  if (typeof DOMParser === 'undefined') return String(value);
  const documentNode = new DOMParser().parseFromString(`<div>${value}</div>`, 'text/html');
  const root = documentNode.body.firstElementChild;
  [...root.querySelectorAll('*')].forEach(node => {
    if (!allowedTags.has(node.tagName)) { node.replaceWith(...node.childNodes); return; }
    [...node.attributes].forEach(attribute => {
      if (!(node.tagName === 'SPAN' && ['data-gap','contenteditable'].includes(attribute.name))) node.removeAttribute(attribute.name);
    });
    if (node.dataset.gap) {
      const gap = Number(node.dataset.gap);
      if (!Number.isInteger(gap) || gap < 1 || gap > 5) node.replaceWith(...node.childNodes);
      else { node.textContent = `Gap ${gap}`; node.setAttribute('contenteditable', 'false'); }
    }
  });
  return root.innerHTML;
}

export function htmlToLegacyPassage(html = '') {
  if (typeof DOMParser === 'undefined') return String(html).replace(GAP_HTML_PATTERN, (_, number) => `[${number}]`).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>|<\/div>/gi, '\n').replace(/<[^>]+>/g, '');
  const documentNode = new DOMParser().parseFromString(`<div>${sanitizePassageHtml(html)}</div>`, 'text/html');
  documentNode.querySelectorAll('[data-gap]').forEach(node => node.replaceWith(documentNode.createTextNode(`[${node.dataset.gap}]`)));
  return documentNode.body.firstElementChild.innerText.replace(/\n{3,}/g, '\n\n').trim();
}

export function getPassageHtml(part = {}) {
  return sanitizePassageHtml(part.passageHtml || legacyPassageToHtml(part.passage));
}

export function splitFormattedPassage(part = {}) {
  const renderableHtml = getPassageHtml(part)
    .replace(/<(p|div)[^>]*>/gi, '')
    .replace(/<\/(p|div)>/gi, '<br><br>')
    .replace(/<blockquote[^>]*>/gi, '<br>&emsp;&emsp;')
    .replace(/<\/blockquote>/gi, '<br>');
  return renderableHtml.split(GAP_HTML_PATTERN).map((html, index) => ({ html, gap: index % 2 ? Number(html) : null }));
}
