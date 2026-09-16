import { toast } from '../../../services/toastStore.js';

const COMPLETED_TESTS_KEY = 'completedSpeakingTests';
const failedWrites = new Set();

function readObject(storage, key) {
  const value = JSON.parse(storage.getItem(key) || '{}');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid speaking data');
  return value;
}

function writeSpeaking(key, operation, message) {
  try {
    operation();
    failedWrites.delete(key);
    return true;
  } catch {
    if (!failedWrites.has(key)) toast.error(message);
    failedWrites.add(key);
    return false;
  }
}

export const saveCompletedSpeakingTest = (testId, resultData) => {
  return writeSpeaking(COMPLETED_TESTS_KEY, () => {
    const existing = readObject(localStorage, COMPLETED_TESTS_KEY);
    
    existing[testId] = {
      ...resultData,
      submittedAt: new Date().toISOString()
    };
    
    localStorage.setItem(COMPLETED_TESTS_KEY, JSON.stringify(existing));
  }, 'We could not save your Speaking test result in this browser. Please allow browser storage or free up some space before leaving.');
};

export const getCompletedSpeakingTests = () => {
  try {
    return readObject(localStorage, COMPLETED_TESTS_KEY);
  } catch {
    return {};
  }
};

export const clearCompletedSpeakingTests = () => {
  return writeSpeaking(COMPLETED_TESTS_KEY, () => localStorage.removeItem(COMPLETED_TESTS_KEY), 'We could not clear your Speaking test history. Please allow browser storage and try again.');
};

export const saveSpeakingPartAnswers = (part, answers) => {
  const key = `speaking_${part}_answers`;
  return writeSpeaking(key, () => sessionStorage.setItem(key, JSON.stringify(answers)), 'We could not save your answers. Please keep this page open, allow browser storage or free up some space, then submit again.');
};

export const getSpeakingPartAnswers = (part) => {
  try {
    const key = `speaking_${part}_answers`;
    // Read old attempts without deleting or rewriting the legacy record.
    return readObject(sessionStorage, sessionStorage.getItem(key) !== null ? key : 'speaking_$part_answers');
  } catch {
    return {};
  }
};

