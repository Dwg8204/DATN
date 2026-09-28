import { useCallback, useEffect } from 'react';
import { normalizeApiError } from '../../../services/apiError.js';
import { testAttemptsApi } from '../services/testAttemptsApi.js';
import { applyLocalChanges, classifySaveRecovery, isRetryableSaveError, splitAnswerChanges } from '../utils/attemptSavePolicy.js';

const SAVE_DELAY_MS = 1_200;
const MAX_SAVE_DELAY_MS = 5_000;
const RETRY_DELAY_MS = 3_000;
const MAX_SAVE_RETRIES = 5;
const hasEntries = value => Object.keys(value).length > 0;

export function useAttemptAutosave({
  attemptId, refs, clearAutosaveTimers, isCurrent,
  adoptRemote, markSubmitted, setAttempt, setSaveStatus, setTimeExpired, showError,
}) {
  const {
    attemptRef, serverAnswersRef, revisionRef, pendingRef, unverifiedRef,
    navigationDirtyRef, flushPromiseRef, flushRef, debounceRef, maximumRef, retryRef,
    retryWaitingRef, retryCountRef, failureNotifiedRef, conflictRemoteRef, submissionRef,
    generationRef, mountedRef, timeExpiredRef,
  } = refs;
  const notifySaveFailure = useCallback(message => {
    if (failureNotifiedRef.current || !mountedRef.current) return;
    failureNotifiedRef.current = true;
    showError(message);
  }, [failureNotifiedRef, mountedRef, showError]);

  const queueRetry = useCallback(() => {
    if (!mountedRef.current) return;
    if (retryCountRef.current >= MAX_SAVE_RETRIES) {
      retryWaitingRef.current = true;
      setSaveStatus('error');
      return;
    }
    const delay = Math.min(RETRY_DELAY_MS * (2 ** retryCountRef.current), 60_000) * (0.8 + Math.random() * 0.4);
    retryCountRef.current += 1;
    retryWaitingRef.current = true;
    window.clearTimeout(retryRef.current);
    retryRef.current = window.setTimeout(() => {
      retryRef.current = null;
      retryWaitingRef.current = false;
      void flushRef.current?.().catch(() => undefined);
    }, delay);
    setSaveStatus('unsaved');
  }, [flushRef, mountedRef, retryCountRef, retryRef, retryWaitingRef, setSaveStatus]);

  const reconcileBatch = useCallback(async (batch, generation) => {
    let remote;
    try {
      remote = await testAttemptsApi.get(attemptId);
    } catch (error) {
      if (isCurrent(generation)) {
        unverifiedRef.current = batch;
        notifySaveFailure('Your save status could not be verified. It will be checked again when the connection is available.');
        queueRetry();
      }
      throw error;
    }
    if (!isCurrent(generation)) return 'stale';
    if (submissionRef.current === 'submitted') return 'submitted';
    if (remote.status === 'SUBMITTED') {
      markSubmitted(remote);
      return 'submitted';
    }
    if (!remote.canAnswer) {
      pendingRef.current = {};
      unverifiedRef.current = null;
      navigationDirtyRef.current = false;
      adoptRemote(remote, false);
      setSaveStatus('saved');
      return 'expired';
    }
    const outcome = classifySaveRecovery(remote, batch);
    unverifiedRef.current = null;
    if (outcome === 'confirmed') {
      adoptRemote(remote);
      retryCountRef.current = 0;
      failureNotifiedRef.current = false;
      return 'confirmed';
    }
    pendingRef.current = { ...batch.changes, ...pendingRef.current };
    if (batch.currentQuestionKey && remote.progress?.currentQuestionKey !== batch.currentQuestionKey) {
      navigationDirtyRef.current = true;
    }
    if (outcome === 'not-saved') {
      adoptRemote(remote);
      return 'not-saved';
    }
    conflictRemoteRef.current = remote;
    setSaveStatus('conflict');
    notifySaveFailure('This test changed in another tab. Choose which version to keep before continuing.');
    return 'conflict';
  }, [adoptRemote, attemptId, conflictRemoteRef, failureNotifiedRef, isCurrent, markSubmitted,
    navigationDirtyRef, notifySaveFailure, pendingRef, queueRetry, retryCountRef, setSaveStatus, submissionRef, unverifiedRef]);

  const flush = useCallback(() => {
    if (flushPromiseRef.current) return flushPromiseRef.current;
    const generation = generationRef.current;
    const work = (async () => {
      clearAutosaveTimers();
      window.clearTimeout(retryRef.current);
      retryRef.current = null;
      retryWaitingRef.current = false;
      while (isCurrent(generation) && attemptId && !conflictRemoteRef.current && submissionRef.current !== 'submitted') {
        if (unverifiedRef.current) {
          const outcome = await reconcileBatch(unverifiedRef.current, generation);
          if (outcome === 'stale' || outcome === 'submitted' || outcome === 'expired') return;
          if (outcome === 'conflict') throw new Error('Resolve the save conflict before continuing.');
          continue;
        }
        if (!hasEntries(pendingRef.current) && !navigationDirtyRef.current) {
          setSaveStatus('saved');
          return;
        }
        let chunks;
        try {
          chunks = splitAnswerChanges(pendingRef.current);
        } catch (error) {
          setSaveStatus('error');
          notifySaveFailure(error.message);
          throw error;
        }
        const batch = {
          changes: chunks[0],
          expectedRevision: revisionRef.current,
          currentQuestionKey: attemptRef.current?.progress?.currentQuestionKey,
        };
        pendingRef.current = Object.assign({}, ...chunks.slice(1));
        navigationDirtyRef.current = chunks.length > 1;
        setSaveStatus('saving');
        try {
          const saved = await testAttemptsApi.saveProgress(attemptId, batch);
          if (!isCurrent(generation)) return;
          serverAnswersRef.current = applyLocalChanges(serverAnswersRef.current, batch.changes);
          revisionRef.current = saved.revision;
          retryCountRef.current = 0;
          failureNotifiedRef.current = false;
          setAttempt(current => current ? { ...current, revision: saved.revision, progress: navigationDirtyRef.current
            ? current.progress : saved.progress } : current);
        } catch (error) {
          if (!isCurrent(generation)) return;
          const errorCode = normalizeApiError(error).code;
          if (errorCode === 'ATTEMPT_REVISION_CONFLICT' || errorCode === 'ATTEMPT_CONFLICT') {
            const outcome = await reconcileBatch(batch, generation);
            if (outcome === 'confirmed' || (outcome === 'not-saved' && errorCode === 'ATTEMPT_REVISION_CONFLICT')) continue;
            if (outcome === 'submitted' || outcome === 'expired' || outcome === 'stale') return;
            if (outcome === 'not-saved') {
              setSaveStatus('error');
              notifySaveFailure('This test could not be saved. Check its status and try again.');
            }
          } else if (isRetryableSaveError(error)) {
            unverifiedRef.current = batch;
            notifySaveFailure(normalizeApiError(error, 'Your progress could not be saved.').message);
            queueRetry();
          } else {
            pendingRef.current = { ...batch.changes, ...pendingRef.current };
            if (batch.currentQuestionKey) navigationDirtyRef.current = true;
            if (errorCode === 'ATTEMPT_EXPIRED') {
              timeExpiredRef.current = true;
              setTimeExpired(true);
            }
            setSaveStatus('error');
            notifySaveFailure(normalizeApiError(error, 'Your progress could not be saved.').message);
          }
          throw error;
        }
      }
    })();
    const promise = work.finally(() => { if (flushPromiseRef.current === promise) flushPromiseRef.current = null; });
    flushPromiseRef.current = promise;
    return promise;
  }, [attemptId, attemptRef, clearAutosaveTimers, conflictRemoteRef, failureNotifiedRef, flushPromiseRef,
    generationRef, isCurrent, navigationDirtyRef, notifySaveFailure, pendingRef, queueRetry,
    reconcileBatch, retryCountRef, retryRef, retryWaitingRef, revisionRef, serverAnswersRef,
    setAttempt, setSaveStatus, setTimeExpired, submissionRef, timeExpiredRef, unverifiedRef]);

  useEffect(() => { flushRef.current = flush; }, [flush, flushRef]);

  const scheduleSave = useCallback(() => {
    if (retryWaitingRef.current) return;
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => void flushRef.current?.().catch(() => undefined), SAVE_DELAY_MS);
    maximumRef.current ??= window.setTimeout(() => void flushRef.current?.().catch(() => undefined), MAX_SAVE_DELAY_MS);
  }, [debounceRef, flushRef, maximumRef, retryWaitingRef]);

  const retrySave = useCallback(() => {
    retryCountRef.current = 0;
    retryWaitingRef.current = false;
    return flushRef.current?.();
  }, [flushRef, retryCountRef, retryWaitingRef]);

  return { flush, scheduleSave, retrySave, notifySaveFailure };
}
