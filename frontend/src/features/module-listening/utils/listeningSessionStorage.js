const KEYS = {
  part1: 'listening_p1_answers',
  part2: 'listening_p2_answers',
  part3: 'listening_p3_answers',
  part4: 'listening_p4_answers',
  testId: 'listening_testId',
  startTime: 'listening_startTime',
};

export function savePartAnswers(partKey, answers) {
  sessionStorage.setItem(KEYS[partKey], JSON.stringify(answers));
}

export function getAllAnswers() {
  return {
    part1: JSON.parse(sessionStorage.getItem(KEYS.part1) || '{}'),
    part2: JSON.parse(sessionStorage.getItem(KEYS.part2) || '{}'),
    part3: JSON.parse(sessionStorage.getItem(KEYS.part3) || '{}'),
    part4: JSON.parse(sessionStorage.getItem(KEYS.part4) || '{}'),
  };
}

export function saveTestMeta(testId) {
  sessionStorage.setItem(KEYS.testId, testId);
  sessionStorage.setItem(KEYS.startTime, Date.now().toString());
}

export function getTestMeta() {
  return {
    testId: sessionStorage.getItem(KEYS.testId),
    startTime: parseInt(sessionStorage.getItem(KEYS.startTime) || '0'),
  };
}

export function clearListeningSession() {
  Object.values(KEYS).forEach(key => sessionStorage.removeItem(key));
}
