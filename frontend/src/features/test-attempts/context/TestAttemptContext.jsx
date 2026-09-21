import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext.jsx';
import { normalizeApiError } from '../../../services/apiError.js';
import { testAttemptsApi } from '../services/testAttemptsApi.js';
import { remainingSeconds as calculateRemaining } from '../utils/attemptTime.js';
import { TestAttemptContext } from './testAttemptContextStore.js';

const SAVE_DELAY_MS = 1_200;
const MAX_SAVE_DELAY_MS = 5_000;

export function TestAttemptProvider({ expectedComponent, children }) {
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const { showError } = useToast();
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loadState, setLoadState] = useState({ attemptId: null, error: '' });
  const [saveStatus, setSaveStatus] = useState('saved');
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const attemptRef = useRef(null);
  const revisionRef = useRef(0);
  const pendingRef = useRef({});
  const inFlightRef = useRef(null);
  const debounceRef = useRef(null);
  const maximumRef = useRef(null);
  const conflictedRef = useRef(false);
  const submittingRef = useRef(false);
  const retryRef = useRef(null);
  const failureNotifiedRef = useRef(false);
  const mountedRef = useRef(true);
  const clockSyncRef = useRef({ serverTime: null, synchronizedAt: null });
  const navigationApprovedRef = useRef(false);
  const approveNavigation = useCallback(() => { navigationApprovedRef.current = true; }, []);
  const isNavigationApproved = useCallback(() => navigationApprovedRef.current, []);

  const clearTimers = useCallback(() => {
    window.clearTimeout(debounceRef.current);
    window.clearTimeout(maximumRef.current);
    window.clearTimeout(retryRef.current);
    debounceRef.current = null;
    maximumRef.current = null;
    retryRef.current = null;
  }, []);

  const flush = useCallback(async function flushPending() {
    if (!attemptId || conflictedRef.current || !Object.keys(pendingRef.current).length) return;
    if (inFlightRef.current) {
      await inFlightRef.current;
      if (!Object.keys(pendingRef.current).length) return;
    }
    clearTimers();
    const changes = pendingRef.current;
    pendingRef.current = {};
    if (mountedRef.current) setSaveStatus('saving');
    const request = testAttemptsApi.saveProgress(attemptId, {
      expectedRevision: revisionRef.current,
      changes,
      currentQuestionKey: attemptRef.current?.progress?.currentQuestionKey,
    }).then(saved => {
      revisionRef.current = saved.revision;
      failureNotifiedRef.current = false;
      if (mountedRef.current) {
        setAttempt(current => current ? { ...current, revision: saved.revision, progress: saved.progress } : current);
        setSaveStatus('saved');
      }
    }).catch(error => {
      pendingRef.current = { ...changes, ...pendingRef.current };
      const normalized = normalizeApiError(error, 'Your progress could not be saved.');
      if (normalized.code === 'ATTEMPT_REVISION_CONFLICT') {
        conflictedRef.current = true;
        if (mountedRef.current) setSaveStatus('conflict');
        showError('This test is open in another tab. Reload this page before continuing.');
      } else {
        if (mountedRef.current) setSaveStatus('unsaved');
        if (!failureNotifiedRef.current) {
          failureNotifiedRef.current = true;
          showError(normalized.message);
        }
        retryRef.current = window.setTimeout(() => void flushPending().catch(() => undefined), 3_000);
      }
      throw error;
    }).finally(() => { inFlightRef.current = null; });
    inFlightRef.current = request;
    return request;
  }, [attemptId, clearTimers, showError]);

  const scheduleSave = useCallback(() => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => void flush().catch(() => undefined), SAVE_DELAY_MS);
    maximumRef.current ??= window.setTimeout(() => void flush().catch(() => undefined), MAX_SAVE_DELAY_MS);
  }, [flush]);

  useEffect(() => {
    mountedRef.current = true;
    if (!attemptId) {
      return () => { mountedRef.current = false; };
    }
    const controller = new AbortController();
    testAttemptsApi.get(attemptId, controller.signal).then(data => {
      if (expectedComponent && data.component !== expectedComponent) throw new Error('This test belongs to another skill.');
      attemptRef.current = data;
      clockSyncRef.current = { serverTime: data.serverTime, synchronizedAt: Date.now() };
      revisionRef.current = data.revision;
      setAttempt(data);
      setAnswers(data.answers ?? {});
      setLoadState({ attemptId, error: '' });
    }).catch(error => {
      if (error.code !== 'ERR_CANCELED') {
        const message = normalizeApiError(error, error.message || 'Unable to load this test.').message;
        setLoadState({ attemptId, error: message });
        showError(message);
      }
    });
    return () => {
      mountedRef.current = false;
      controller.abort();
      clearTimers();
    };
  }, [attemptId, clearTimers, expectedComponent, showError]);

  const missingAttemptError = 'The test session is missing. Start the test again from the test list.';
  const loading = Boolean(attemptId) && loadState.attemptId !== attemptId;
  const loadError = attemptId ? (loadState.attemptId === attemptId ? loadState.error : '') : missingAttemptError;

  useEffect(() => {
    if (!attempt?.expiresAt) return undefined;
    const update = () => setSecondsLeft(calculateRemaining(
      attempt.expiresAt,
      clockSyncRef.current.serverTime,
      clockSyncRef.current.synchronizedAt,
      Date.now(),
    ));
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [attempt?.expiresAt, attempt?.serverTime]);

  useEffect(() => {
    const saveWhenHidden = () => {
      if (document.visibilityState === 'hidden') void flush().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', saveWhenHidden);
    return () => document.removeEventListener('visibilitychange', saveWhenHidden);
  }, [flush]);

  const setAnswer = useCallback((key, answer) => {
    if (!attemptRef.current?.canAnswer || conflictedRef.current) return;
    pendingRef.current = { ...pendingRef.current, [key]: answer };
    setAnswers(current => {
      const next = { ...current };
      if (answer == null) delete next[key];
      else next[key] = answer;
      return next;
    });
    attemptRef.current = {
      ...attemptRef.current,
      progress: { ...(attemptRef.current.progress ?? {}), currentQuestionKey: key },
    };
    setSaveStatus('unsaved');
    scheduleSave();
  }, [scheduleSave]);

  const submit = useCallback(async ({ expired = false } = {}) => {
    if (!attemptId || submittingRef.current || conflictedRef.current) return null;
    submittingRef.current = true;
    setSubmitting(true);
    clearTimers();
    try {
      if (!expired) await flush();
      const finalChanges = expired ? {} : pendingRef.current;
      pendingRef.current = {};
      const result = await testAttemptsApi.submit(attemptId, {
        expectedRevision: revisionRef.current,
        ...(Object.keys(finalChanges).length ? { finalChanges } : {}),
      });
      attemptRef.current = attemptRef.current ? { ...attemptRef.current, status: 'SUBMITTED', canAnswer: false } : null;
      setAttempt(current => current ? { ...current, status: 'SUBMITTED', canAnswer: false } : current);
      setSaveStatus('saved');
      return result;
    } catch (error) {
      showError(normalizeApiError(error, 'Unable to submit this test.').message);
      throw error;
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  }, [attemptId, clearTimers, flush, showError]);

  const value = useMemo(() => ({
    attemptId, attempt, paper: attempt?.paper, answers, loading, loadError, saveStatus,
    submitting, secondsLeft, setAnswer, flush, submit,
    approveNavigation, isNavigationApproved,
  }), [answers, approveNavigation, attempt, attemptId, flush, isNavigationApproved, loadError, loading, saveStatus, secondsLeft, setAnswer, submit, submitting]);

  return <TestAttemptContext.Provider value={value}>{children}</TestAttemptContext.Provider>;
}
