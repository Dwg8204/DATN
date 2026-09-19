import { FilterXSS } from 'xss';

// Keep this list aligned with frontend/src/components/common/richText.js.
const tags = ['p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote'];
const filter = new FilterXSS({
  whiteList: Object.fromEntries(tags.map(tag => [tag, []])),
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object'],
});

const namedEntities: Record<string, string> = {
  nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ',
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#(?:x([\da-f]+)|(\d+));/gi, (entity, hex: string | undefined, decimal: string | undefined) => {
      const codePoint = parseInt(hex ?? decimal ?? '', hex ? 16 : 10);
      return codePoint > 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
    })
    .replace(/&([a-z]+);/gi, (entity, name: string) => namedEntities[name.toLowerCase()] ?? entity)
    .replace(/[\u200b-\u200d\ufeff]/g, '');
}

export function sanitizeRichText(value: string): string {
  return filter.process(value).trim();
}

export function plainRichText(value: string): string {
  return decodeEntities(sanitizeRichText(value)
    .replace(/<br\s*\/?>|<\/(?:p|div|li|blockquote)>/gi, ' ')
    .replace(/<[^>]*>/g, ''))
    .replace(/\s+/gu, ' ')
    .trim();
}

export function richTextWordCount(value: string): number {
  const plain = plainRichText(value);
  return plain ? plain.split(/\s+/u).length : 0;
}
