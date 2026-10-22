import { EvidencePassage } from '../services/writing-evidence-ids';

/** Test-only adapter; production never converts model-written quotations into IDs. */
export function evidenceFixture(value: unknown, catalog: EvidencePassage[]): any {
  const id = (text: string, key?: string) => {
    const entry = catalog.find(entry => entry.questionKey === key && entry.text === text);
    if (!entry) throw new Error('TEST_EVIDENCE_NOT_IN_CATALOG');
    return entry.id;
  };
  const walk = (row: any, key?: string): any => {
    if (Array.isArray(row)) return row.map(entry => walk(entry, key));
    if (!row || typeof row !== 'object') return row;
    key = row.questionKey ?? key;
    return Object.fromEntries(Object.entries(row).map(([field, item]) => {
      if (field === 'evidenceQuotes') return ['evidenceIds', (item as string[]).map(text => id(text, key))];
      if (field === 'quote' || field === 'original') return [field === 'quote' ? 'evidenceId' : 'originalId', id(item as string, key)];
      if (field === 'criteria' && Array.isArray(item)) return [field, Object.fromEntries(item.map(entry => {
        const { criterion, ...rest } = entry;
        return [criterion, walk(rest, key)];
      }))];
      return [field, walk(item, key)];
    }));
  };
  return walk(value);
}
