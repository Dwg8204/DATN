import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext.jsx';
import { normalizeApiError } from '../../../services/apiError.js';
import { testAttemptsApi } from '../services/testAttemptsApi.js';
import { remainingSeconds as calculateRemaining } from '../utils/attemptTime.js';
import { applyLocalChanges, changedAnswers } from '../utils/attemptSavePolicy.js';
import { AttemptTimerContext, TestAttemptContext } from './testAttemptContextStore.js';
import { useAttemptAutosave } from './useAttemptAutosave.js';

const hasEntries = value => Object.keys(value).length > 0;

export function TestAttemptProvider({ expectedComponent, children }) {
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  return <TestAttemptSession key={`${expectedComponent ?? 'ANY'}:${attemptId ?? 'missing'}`}
    attemptId={attemptId} expectedComponent={expectedComponent}>{children}</TestAttemptSession>;
}

function TestAttemptSession({ attemptId, expectedComponent, children }) {
  const { showError } = useToast();
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loadState, setLoadState] = useState({ attemptId: null, error: '' });
  const [saveStatus, setSaveStatus] = useState('saved');
  const [submissionState, setSubmissionState] = useState('idle');
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [timeExpired, setTimeExpired] = useState(false);
  const attemptRef = useRef(null);
  const answersRef = useRef({});
  const serverAnswersRef = useRef({});
  const revisionRef = useRef(0);
  const pendingRef = useRef({});
  const unverifiedRef = useRef(null);
  const navigationDirtyRef = useRef(false);
  const flushPromiseRef = useRef(null);
  const reconciliationRef = useRef(null);
  const flushRef = useRef(null);
  const debounceRef = useRef(null);
  const maximumRef = useRef(null);
  const retryRef = useRef(null);
  const retryWaitingRef = useRef(false);
  const retryCountRef = useRef(0);
  const failureNotifiedRef = useRef(false);
  const conflictRemoteRef = useRef(null);
  const submissionRef = useRef('idle');
  const clockSyncRef = useRef({ serverTime: null, synchronizedAt: null });
  const navigationApprovedRef = useRef(false);
  const generationRef = useRef(0);
  const mountedRef = useRef(false);
  const timeExpiredRef = useRef(false);
  const approveNavigation = useCallback(() => { navigationApprovedRef.current = true; }, []);
  const isNavigationApproved = useCallback(() => navigationApprovedRef.current, []);
  const isCurrent = useCallback(generation => mountedRef.current && generationRef.current === generation, []);

  const updateSubmission = useCallback(state => {
    submissionRef.current = state;
    if (mountedRef.current) setSubmissionState(state);
  }, []);

  const clearAutosaveTimers = useCallback(() => {
    window.clearTimeout(debounceRef.current);
    window.clearTimeout(maximumRef.current);
    debounceRef.current = null;
    maximumRef.current = null;
  }, []);

  const clearTimers = useCallback(() => {
    clearAutosaveTimers();
    window.clearTimeout(retryRef.current);
    retryRef.current = null;
  }, [clearAutosaveTimers]);

  const publishAnswers = useCallback(next => {
    answersRef.current = next;
    if (mountedRef.current) setAnswers(next);
  }, []);

  const adoptRemote = useCallback((remote, preserveLocal = true) => {
    if (submissionRef.current === 'submitted' && remote.status !== 'SUBMITTED') return;
    const localCursor = attemptRef.current?.progress?.currentQuestionKey;
    serverAnswersRef.current = remote.answers ?? {};
    revisionRef.current = remote.revision;
    clockSyncRef.current = { serverTime: remote.serverTime, synchronizedAt: Date.now() };
    const progress = navigationDirtyRef.current && localCursor
      ? { ...remote.progress, currentQuestionKey: localCursor } : remote.progress;
    const current = { ...remote, progress };
    attemptRef.current = current;
    publishAnswers(preserveLocal ? applyLocalChanges(serverAnswersRef.current, pendingRef.current) : serverAnswersRef.current);
    if (remote.status === 'IN_PROGRESS' && !remote.canAnswer) {
      timeExpiredRef.current = true;
      if (mountedRef.current) setTimeExpired(true);
    }
    if (mountedRef.current) setAttempt(current);
  }, [publishAnswers]);

  const markSubmitted = useCallback(remote => {
    clearTimers();
    pendingRef.current = {};
    unverifiedRef.current = null;
    navigationDirtyRef.current = false;
    retryWaitingRef.current = false;
    if (remote) adoptRemote(remote, false);
    else {
      attemptRef.current = attemptRef.current ? { ...attemptRef.current, status: 'SUBMITTED', canAnswer: false } : null;
      if (mountedRef.current) setAttempt(current => current ? { ...current, status: 'SUBMITTED', canAnswer: false } : current);
    }
    updateSubmission('submitted');
    if (mountedRef.current) setSaveStatus('saved');
  }, [adoptRemote, clearTimers, updateSubmission]);

  const { flush, scheduleSave, retrySave, notifySaveFailure } = useAttemptAutosave({
    attemptId,
    refs: {
      attemptRef, serverAnswersRef, revisionRef, pendingRef, unverifiedRef,
      navigationDirtyRef, flushPromiseRef, flushRef, debounceRef, maximumRef, retryRef,
      retryWaitingRef, retryCountRef, failureNotifiedRef, conflictRemoteRef, submissionRef,
      generationRef, mountedRef, timeExpiredRef,
    },
    clearAutosaveTimers, isCurrent,
    adoptRemote, markSubmitted, setAttempt, setSaveStatus, setTimeExpired, showError,
  });

  useEffect(() => {
    generationRef.current += 1;
    const generation = generationRef.current;
    mountedRef.current = true;
    if (attemptId) {
      const controller = new AbortController();
      testAttemptsApi.get(attemptId, controller.signal).then(data => {
        if (!isCurrent(generation)) return;
        if (expectedComponent && data.component !== expectedComponent) throw new Error('This test belongs to another skill.');
        adoptRemote(data, false);
        updateSubmission(data.status === 'SUBMITTED' ? 'submitted' : 'idle');
        setLoadState({ attemptId, error: '' });
      }).catch(error => {
        if (isCurrent(generation) && error.code !== 'ERR_CANCELED') {
          const message = normalizeApiError(error, error.message || 'Unable to load this test.').message;
          setLoadState({ attemptId, error: message });
          showError(message);
        }
      });
      return () => {
        mountedRef.current = false;
        generationRef.current += 1;
        controller.abort();
        clearTimers();
      };
    }
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      clearTimers();
    };
  }, [adoptRemote, attemptId, clearTimers, expectedComponent, isCurrent, showError, updateSubmission]);

  const missingAttemptError = 'The test session is missing. Start the test again from the test list.';
  const loading = Boolean(attemptId) && loadState.attemptId !== attemptId;
  const loadError = attemptId ? (loadState.attemptId === attemptId ? loadState.error : '') : missingAttemptError;

  useEffect(() => {
    if (!attempt?.expiresAt) return undefined;
    const update = () => {
      const remaining = calculateRemaining(attempt.expiresAt, clockSyncRef.current.serverTime,
        clockSyncRef.current.synchronizedAt, Date.now());
      setSecondsLeft(remaining);
      if (remaining === 0 && !timeExpiredRef.current) {
        timeExpiredRef.current = true;
        setTimeExpired(true);
      }
    };
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [attempt?.expiresAt, attempt?.serverTime]);

  useEffect(() => {
    const saveWhenHidden = () => {
      if (document.visibilityState === 'hidden') void flushRef.current?.().catch(() => undefined);
    };
    const saveWhenOnline = () => {
      retryCountRef.current = 0;
      retryWaitingRef.current = false;
      if (unverifiedRef.current || hasEntries(pendingRef.current) || navigationDirtyRef.current) {
        void flushRef.current?.().catch(() => undefined);
      }
    };
    document.addEventListener('visibilitychange', saveWhenHidden);
    window.addEventListener('online', saveWhenOnline);
    return () => {
      document.removeEventListener('visibilitychange', saveWhenHidden);
      window.removeEventListener('online', saveWhenOnline);
    };
  }, []);

  const setAnswer = useCallback((key, answer) => {
    if (!attemptRef.current?.canAnswer || timeExpiredRef.current || conflictRemoteRef.current || submissionRef.current !== 'idle') return;
    pendingRef.current = { ...pendingRef.current, [key]: answer };
    publishAnswers(applyLocalChanges(answersRef.current, { [key]: answer }));
    attemptRef.current = { ...attemptRef.current,
      progress: { ...(attemptRef.current.progress ?? {}), currentQuestionKey: key } };
    navigationDirtyRef.current = true;
    setSaveStatus(retryWaitingRef.current && !retryRef.current ? 'error' : 'unsaved');
    scheduleSave();
  }, [publishAnswers, scheduleSave]);

  const setCurrentQuestion = useCallback(key => {
    if (!attemptRef.current?.canAnswer || timeExpiredRef.current || conflictRemoteRef.current || submissionRef.current !== 'idle' || !key) return;
    if (attemptRef.current.progress?.currentQuestionKey === key) return;
    attemptRef.current = { ...attemptRef.current,
      progress: { ...(attemptRef.current.progress ?? {}), currentQuestionKey: key } };
    navigationDirtyRef.current = true;
    setSaveStatus(retryWaitingRef.current && !retryRef.current ? 'error' : 'unsaved');
    scheduleSave();
  }, [scheduleSave]);

  const resolveSaveConflict = useCallback(strategy => {
    const remote = conflictRemoteRef.current;
    if (!remote) return;
    const localAnswers = answersRef.current;
    const localCursor = attemptRef.current?.progress?.currentQuestionKey;
    conflictRemoteRef.current = null;
    retryCountRef.current = 0;
    failureNotifiedRef.current = false;
    if (remote.status === 'SUBMITTED' || strategy === 'server') {
      pendingRef.current = {};
      navigationDirtyRef.current = false;
      adoptRemote(remote, false);
      if (remote.status === 'SUBMITTED') markSubmitted(remote);
      else setSaveStatus('saved');
      return;
    }
    pendingRef.current = changedAnswers(remote.answers ?? {}, localAnswers);
    navigationDirtyRef.current = Boolean(localCursor && localCursor !== remote.progress?.currentQuestionKey);
    adoptRemote(remote);
    if (navigationDirtyRef.current) {
      attemptRef.current = { ...attemptRef.current, progress: { ...attemptRef.current.progress, currentQuestionKey: localCursor } };
    }
    setSaveStatus(hasEntries(pendingRef.current) || navigationDirtyRef.current ? 'unsaved' : 'saved');
    scheduleSave();
  }, [adoptRemote, markSubmitted, scheduleSave]);

  const reconcileSubmission = useCallback(() => {
    if (reconciliationRef.current) return reconciliationRef.current;
    const generation = generationRef.current;
    const check = (async () => {
      const remote = await testAttemptsApi.get(attemptId);
      if (!isCurrent(generation)) return null;
      if (submissionRef.current === 'submitted') return testAttemptsApi.result(attemptId);
      if (remote.status === 'SUBMITTED') {
        markSubmitted(remote);
        return testAttemptsApi.result(attemptId);
      }
      if (remote.canAnswer && !timeExpiredRef.current) {
        if (hasEntries(changedAnswers(remote.answers ?? {}, answersRef.current)) ||
          hasEntries(pendingRef.current) || unverifiedRef.current) {
          conflictRemoteRef.current = remote;
          setSaveStatus('conflict');
          notifySaveFailure('The saved answers changed while submission was being checked. Choose which version to keep before submitting again.');
        } else adoptRemote(remote, false);
        updateSubmission('idle');
      } else updateSubmission('verifying');
      return null;
    })();
    reconciliationRef.current = check;
    void check.then(() => {
      if (reconciliationRef.current === check) reconciliationRef.current = null;
    }, () => {
      if (reconciliationRef.current === check) reconciliationRef.current = null;
    });
    return check;
  }, [adoptRemote, attemptId, isCurrent, markSubmitted, notifySaveFailure, updateSubmission]);

  const submit = useCallback(async ({ expired = false } = {}) => {
    if (!attemptId || submissionRef.current === 'submitting' || (conflictRemoteRef.current && !expired)) return null;
    const generation = generationRef.current;
    if (submissionRef.current === 'submitted') return testAttemptsApi.result(attemptId);
    if (submissionRef.current === 'verifying' || (expired && conflictRemoteRef.current)) {
      const result = await reconcileSubmission();
      if (!isCurrent(generation) || result || (submissionRef.current === 'verifying' && !expired)) return result;
    }
    if (expired) {
      conflictRemoteRef.current = null;
      timeExpiredRef.current = true;
      setTimeExpired(true);
    }
    updateSubmission('submitting');
    clearTimers();
    let requestSent = false;
    try {
      if (!expired) await flush();
      else {
        if (flushPromiseRef.current) await flushPromiseRef.current.catch(() => undefined);
        clearTimers();
        pendingRef.current = {};
        unverifiedRef.current = null;
        navigationDirtyRef.current = false;
      }
      if (!isCurrent(generation)) return null;
      if (submissionRef.current === 'submitted') return testAttemptsApi.result(attemptId);
      requestSent = true;
      const result = await testAttemptsApi.submit(attemptId, { expectedRevision: revisionRef.current });
      if (!isCurrent(generation)) return null;
      markSubmitted();
      return result;
    } catch (error) {
      if (!isCurrent(generation)) return null;
      if (requestSent) {
        updateSubmission('verifying');
        try {
          const confirmed = await reconcileSubmission();
          if (confirmed) return confirmed;
        } catch {
          if (submissionRef.current !== 'submitted') updateSubmission('verifying');
        }
      } else updateSubmission('idle');
      if (!expired && mountedRef.current) showError(normalizeApiError(error, 'Unable to submit this test.').message);
      throw error;
    } finally {
      if (isCurrent(generation) && submissionRef.current === 'submitting') updateSubmission('idle');
    }
  }, [attemptId, clearTimers, flush, isCurrent, markSubmitted, reconcileSubmission, showError, updateSubmission]);

  const value = useMemo(() => ({
    attemptId, attempt, paper: attempt?.paper, answers, loading, loadError, saveStatus,
    submitting: submissionState === 'submitting' || submissionState === 'verifying', submissionState,
    timeExpired, setAnswer, setCurrentQuestion, resolveSaveConflict, retrySave, flush, submit,
    reconcileSubmission, approveNavigation, isNavigationApproved,
  }), [answers, approveNavigation, attempt, attemptId, flush, isNavigationApproved, loadError, loading,
    reconcileSubmission, resolveSaveConflict, retrySave, saveStatus, setAnswer, setCurrentQuestion,
    submissionState, submit, timeExpired]);

  return <TestAttemptContext.Provider value={value}>
    <AttemptTimerContext.Provider value={secondsLeft}>{children}</AttemptTimerContext.Provider>
  </TestAttemptContext.Provider>;
}
