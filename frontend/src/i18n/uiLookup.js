export const normalizeUiText = text => text.replace(/\s+/g, ' ').trim().toLowerCase().replace(/\.{3}/g, '…');

export function createUiLookup(en, vi) {
  const lookup = new Map();
  lookup.patterns = [];
  const visit = (object, prefix = '') => {
    for (const [name, value] of Object.entries(object)) {
      const key = prefix ? `${prefix}.${name}` : name;
      if (typeof value === 'string') {
        if (!lookup.has(normalizeUiText(value))) lookup.set(normalizeUiText(value), key);
        const parts = value.split(/(\{\{\w+\}\})/g);
        if (parts.length > 1 && /[A-Za-zÀ-ỹ]/.test(value.replace(/\{\{\w+\}\}/g, ''))) {
          const names = [];
          const pattern = parts.map(part => {
            if (/^\{\{\w+\}\}$/.test(part)) { names.push(part.slice(2, -2)); return '(.+?)'; }
            return part.replace(/\s+/g, ' ').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          }).join('');
          lookup.patterns.push({ key, names, specificity: value.replace(/\{\{\w+\}\}/g, '').length, regex: new RegExp(`^${pattern}$`, 'i') });
        }
      } else if (value && typeof value === 'object') visit(value, key);
    }
  };
  visit(en); visit(vi);
  lookup.patterns.sort((a, b) => b.specificity - a.specificity);
  return lookup;
}

export function translateUiText(lookup, t, text, values = {}) {
  if (typeof text !== 'string') return text;
  const key = lookup.get(normalizeUiText(text));
  const padding = translated => text.match(/^\s*/)[0] + translated + text.match(/\s*$/)[0];
  if (key) return padding(t(key, values));
  for (const pattern of lookup.patterns ?? []) {
    const match = text.replace(/\s+/g, ' ').trim().match(pattern.regex);
    if (match) return padding(t(pattern.key, { ...Object.fromEntries(pattern.names.map((name, i) => [name, match[i + 1]])), ...values }));
  }
  return text.replace(/\{\{(\w+)\}\}/g, (match, name) => values[name] ?? match);
}

export function translateUiErrorText(lookup, t, text) {
  if (typeof text !== 'string') return text;
  // Validation helpers prefix a rule with its question/field; localize both pieces.
  return text.split(/:\s+/).map(part => translateUiText(lookup, t, part)).join(': ');
}
