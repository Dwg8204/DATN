import { DICTATION_EXERCISES, DICTATION_FLASHCARDS } from '../data/dictationExercises.js';

const keys = ['progress', 'flashcards', 'savedWords', 'customWords', 'customSentences', 'customTopics', 'itemOverrides', 'deletedSentences'];
export function hasLegacyStudyData(storage) {
  return keys.some(key => storage.getItem(`aptimate.dictation.${key}`) !== null);
}

// Read-only migration adapter. Legacy browser data stays intact as a backup.
export function readLegacyStudyData(storage) {
  const read = (key, fallback) => {
    try { const value = JSON.parse(storage.getItem(`aptimate.dictation.${key}`)); return value ?? fallback; } catch { return fallback; }
  };
  const array = key => { const value = read(key, []); return Array.isArray(value) ? value : []; };
  const object = key => { const value = read(key, {}); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; };
  const overrides = object('itemOverrides'), ratings = object('flashcards'), progress = object('progress');
  const saved = read('savedWords', null), deleted = array('deletedSentences');
  const items = [];
  const seen = new Set();
  const add = (entry, kind) => {
    if (!entry || typeof entry.id !== 'string' || entry.id.length > 100 || seen.has(entry.id)) return;
    const content = { ...entry, ...(overrides[entry.id] || {}) };
    const word = String(content.word || content.title || '').trim().slice(0, 255);
    const meaning = String(content.meaning || content.transcript || '').trim().slice(0, 5000);
    const topic = String(content.topic || 'Other').trim().slice(0, 40);
    if (!word || !meaning || !topic) return;
    seen.add(entry.id);
    const item = { legacyId: entry.id, kind, word, meaning, topic,
      pronunciation: String(content.pronunciation || '').slice(0, 255),
      type: String(content.type || '').slice(0, 50), example: String(content.example || '').slice(0, 5000),
      hidden: kind === 'WORD' ? Array.isArray(saved) && !saved.includes(entry.id) : deleted.includes(entry.id) };
    if (kind === 'SENTENCE') {
      item.accent = content.accent === 'en-US' ? 'en-US' : 'en-GB';
      const p = progress[entry.id];
      if (p && Number.isInteger(p.attempts) && p.attempts > 0) {
        const score = v => Number.isFinite(Number(v)) ? Math.min(100, Math.max(0, Number(v))) : 0;
        item.progress = { attempts: Math.min(100000, p.attempts), lastAccuracy: score(p.lastAccuracy ?? p.bestAccuracy), bestAccuracy: score(p.bestAccuracy) };
        if (p.updatedAt && !Number.isNaN(Date.parse(p.updatedAt))) item.progress.updatedAt = new Date(p.updatedAt).toISOString();
      }
    } else if (['know', 'learning'].includes(ratings[entry.id])) item.rating = ratings[entry.id] === 'know' ? 'KNOWN' : 'LEARNING';
    items.push(item);
  };
  [...DICTATION_FLASHCARDS, ...array('customWords')].forEach(item => add(item, 'WORD'));
  [...DICTATION_EXERCISES, ...array('customSentences')].forEach(item => add(item, 'SENTENCE'));
  const topics = [...new Set(array('customTopics').map(t => String(t?.name || '').trim().slice(0, 40)).filter(Boolean))].slice(0, 100);
  return { topics, items: items.slice(0, 500) };
}
