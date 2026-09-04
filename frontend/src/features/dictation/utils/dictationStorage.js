const STORAGE_KEY = 'aptimate.dictation.progress';

export function loadDictationProgress() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveDictationAttempt(exerciseId, result) {
  const progress = loadDictationProgress();
  const previous = progress[exerciseId] || { attempts: 0, bestAccuracy: 0 };
  progress[exerciseId] = {
    attempts: previous.attempts + 1,
    bestAccuracy: Math.max(previous.bestAccuracy, result.accuracy),
    lastAccuracy: result.accuracy,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  return progress;
}

