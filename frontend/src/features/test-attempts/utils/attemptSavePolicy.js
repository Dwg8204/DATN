import { normalizeApiError } from '../../../services/apiError.js';

export const answersEqual = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

export function applyLocalChanges(answers, changes) {
  const next = { ...answers };
  for (const [key, answer] of Object.entries(changes)) {
    if (answer == null) delete next[key];
    else next[key] = answer;
  }
  return next;
}

export function changedAnswers(remoteAnswers, localAnswers) {
  return Object.fromEntries([...new Set([...Object.keys(remoteAnswers ?? {}), ...Object.keys(localAnswers ?? {})])]
    .filter(key => !answersEqual(remoteAnswers?.[key], localAnswers?.[key]))
    .map(key => [key, localAnswers?.[key] ?? null]));
}

export function batchReachedServer(remoteAnswers, changes, remoteCursor, sentCursor) {
  return Object.entries(changes).every(([key, answer]) => answersEqual(remoteAnswers?.[key], answer))
    && (!sentCursor || remoteCursor === sentCursor);
}

export function classifySaveRecovery(remote, batch) {
  if (batchReachedServer(remote.answers, batch.changes, remote.progress?.currentQuestionKey, batch.currentQuestionKey)) return 'confirmed';
  if (remote.revision === batch.expectedRevision) return 'not-saved';
  return 'conflict';
}

export function splitAnswerChanges(changes, maxBytes = 64 * 1024) {
  const batches = [];
  let current = {};
  for (const [key, answer] of Object.entries(changes)) {
    const candidate = { ...current, [key]: answer };
    if (new TextEncoder().encode(JSON.stringify(candidate)).length <= maxBytes) {
      current = candidate;
      continue;
    }
    if (!Object.keys(current).length) throw new Error('One answer exceeds the save limit. Shorten it before continuing.');
    batches.push(current);
    current = { [key]: answer };
    if (new TextEncoder().encode(JSON.stringify(current)).length > maxBytes) {
      throw new Error('One answer exceeds the save limit. Shorten it before continuing.');
    }
  }
  if (Object.keys(current).length || !batches.length) batches.push(current);
  return batches;
}

export function isRetryableSaveError(error) {
  const { code, status } = normalizeApiError(error);
  return !status || code === 'ERR_NETWORK' || code === 'ECONNABORTED' || code === 'ETIMEDOUT'
    || status === 408 || status === 429 || status >= 500;
}

export async function waitForActiveSave(activeRequestRef) {
  while (activeRequestRef.current) await activeRequestRef.current;
}
