const HISTORY_KEY = 'aptimate.learning_history';

export function saveHistoryEntry(entry) {
  try {
    const existingStr = localStorage.getItem(HISTORY_KEY);
    const existing = existingStr ? JSON.parse(existingStr) : [];
    
    // Ensure we don't duplicate by ID if for some reason it's called twice
    const filtered = existing.filter(e => e.id !== entry.id);
    filtered.push(entry);
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error saving history entry:', error);
  }
}

export function updateHistoryEntry(id, updates) {
  try {
    const existingStr = localStorage.getItem(HISTORY_KEY);
    const existing = existingStr ? JSON.parse(existingStr) : [];
    
    const index = existing.findIndex(e => e.id === id);
    if (index !== -1) {
      existing[index] = { ...existing[index], ...updates };
      localStorage.setItem(HISTORY_KEY, JSON.stringify(existing));
    }
  } catch (error) {
    console.error('Error updating history entry:', error);
  }
}

export function getHistoryEntries() {
  try {
    const existingStr = localStorage.getItem(HISTORY_KEY);
    const existing = existingStr ? JSON.parse(existingStr) : [];
    
    // Sort by submittedAt descending (newest first)
    return existing.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  } catch (error) {
    console.error('Error getting history entries:', error);
    return [];
  }
}

export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing history:', error);
  }
}
