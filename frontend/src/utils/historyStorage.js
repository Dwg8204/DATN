import { toast } from '../services/toastStore.js';

const HISTORY_KEY = 'aptimate.learning_history';
let hasWriteFailure = false;

function readHistory() {
  const entries = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  if (!Array.isArray(entries)) throw new Error('Invalid history data');
  return entries;
}

function writeHistory(operation) {
  try {
    operation();
    hasWriteFailure = false;
    return true;
  } catch {
    if (!hasWriteFailure) {
      toast.error('Your result is still available on this page, but we could not save your learning history. Please allow browser storage or free up some space before leaving.');
    }
    hasWriteFailure = true;
    return false;
  }
}

export function saveHistorySnapshot(id, data) {
  return writeHistory(() => localStorage.setItem(`history_data_${id}`, JSON.stringify(data)));
}

export function saveHistoryEntry(entry) {
  return writeHistory(() => {
    const existing = readHistory();
    
    // Ensure we don't duplicate by ID if for some reason it's called twice
    const filtered = existing.filter(e => e.id !== entry.id);
    filtered.push(entry);
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  });
}

export function updateHistoryEntry(id, updates) {
  return writeHistory(() => {
    const existing = readHistory();
    
    const index = existing.findIndex(e => e.id === id);
    if (index !== -1) {
      existing[index] = { ...existing[index], ...updates };
      localStorage.setItem(HISTORY_KEY, JSON.stringify(existing));
    }
  });
}

export function getHistoryEntries() {
  try {
    const existing = readHistory();
    
    // Sort by submittedAt descending (newest first)
    return existing.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  } catch {
    return [];
  }
}

/** Remove only legacy Reading results kept on this device. Server attempts are unaffected. */
export function purgeLegacyReadingHistory() {
  try {
    const existing = readHistory();
    const reading = existing.filter(entry => entry?.skill === 'reading');
    if (!reading.length) return 0;
    for (const entry of reading) {
      if (typeof entry.id === 'string' && /^hist_[\w-]+$/.test(entry.id)) {
        localStorage.removeItem(`history_data_${entry.id}`);
      }
      const sessionId = typeof entry.reviewUrl === 'string'
        ? /^\/reading\/result\/(sess-[\w-]+)$/.exec(entry.reviewUrl)?.[1] : null;
      if (sessionId) localStorage.removeItem(sessionId);
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existing.filter(entry => entry?.skill !== 'reading')));
    return reading.length;
  } catch {
    return 0;
  }
}

export function clearHistory() {
  return writeHistory(() => localStorage.removeItem(HISTORY_KEY));
}
