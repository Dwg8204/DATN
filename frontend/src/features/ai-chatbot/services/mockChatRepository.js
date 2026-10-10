const STORAGE_PREFIX = 'aptimate.chatbot.sessions.';

export const createSession = () => ({ id: crypto.randomUUID(), title: 'New conversation', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messages: [] });

export function loadChatSessions(userKey = 'guest') {
  try {
    const value = JSON.parse(window.localStorage.getItem(`${STORAGE_PREFIX}${userKey}`) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

export function saveChatSessions(userKey = 'guest', sessions) {
  window.localStorage.setItem(`${STORAGE_PREFIX}${userKey}`, JSON.stringify(sessions));
}

export function makeMockReply(message) {
  const prompt = message.toLowerCase();
  if (prompt.includes('writing')) return 'For Aptis Writing, identify the reader, purpose, and required word count first. Plan one clear idea for each sentence, then review verb forms, articles, and linking words before submitting.';
  if (prompt.includes('grammar')) return 'Identify the grammar clue before choosing an answer. Look for time expressions, the subject, and the words immediately before and after the gap. This usually narrows the options quickly.';
  if (prompt.includes('vocabulary')) return 'Learn vocabulary in context rather than as isolated translations. Save a useful word, write one sentence of your own, and review it again after using it in a practice task.';
  return 'I can help you break this into a practical Aptis study step. Tell me which skill or part you are preparing for, and share the question or difficulty you want to work on.';
}
