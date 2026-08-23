const COMPLETED_TESTS_KEY = 'completedSpeakingTests';

export const saveCompletedSpeakingTest = (testId, resultData) => {
  try {
    const existingStr = localStorage.getItem(COMPLETED_TESTS_KEY);
    const existing = existingStr ? JSON.parse(existingStr) : {};
    
    existing[testId] = {
      ...resultData,
      submittedAt: new Date().toISOString()
    };
    
    localStorage.setItem(COMPLETED_TESTS_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error('Error saving completed speaking test:', error);
  }
};

export const getCompletedSpeakingTests = () => {
  try {
    const existingStr = localStorage.getItem(COMPLETED_TESTS_KEY);
    return existingStr ? JSON.parse(existingStr) : {};
  } catch (error) {
    console.error('Error getting completed speaking tests:', error);
    return {};
  }
};

export const clearCompletedSpeakingTests = () => {
  try {
    localStorage.removeItem(COMPLETED_TESTS_KEY);
  } catch (error) {
    console.error('Error clearing completed speaking tests:', error);
  }
};

export const saveSpeakingPartAnswers = (part, answers) => {
  sessionStorage.setItem("speaking_$part_answers", JSON.stringify(answers));
};

export const getSpeakingPartAnswers = (part) => {
  return JSON.parse(sessionStorage.getItem("speaking_$part_answers") || '{}');
};

