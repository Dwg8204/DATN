import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext.jsx';
import { normalizeApiError } from '../../../services/apiError.js';
import { practiceAttemptsApi } from '../services/practiceAttemptsApi.js';
import { applyLocalChanges } from '../utils/attemptSavePolicy.js';
import { AttemptTimerContext, TestAttemptContext } from './testAttemptContextStore.js';

export function PracticeAttemptProvider({ expectedComponent, children }) {
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  return <PracticeAttemptSession key={`${expectedComponent}:${attemptId ?? 'missing'}`}
    attemptId={attemptId} expectedComponent={expectedComponent}>{children}</PracticeAttemptSession>;
}

function PracticeAttemptSession({ attemptId, expectedComponent, children }) {
  const { showError } = useToast();
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [revealedAnswers, setRevealedAnswers] = useState({});
  const [loading, setLoading] = useState(Boolean(attemptId));
  const [loadError, setLoadError] = useState(attemptId ? '' : 'The practice session is missing. Start again from the practice list.');
  const [submitting, setSubmitting] = useState(false);
  const navigationApprovedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    let active = true;
    mountedRef.current = true;
    if (!attemptId) return () => { active = false; mountedRef.current = false; };
    const controller = new AbortController();
    setLoading(true);
    practiceAttemptsApi.get(attemptId, controller.signal).then(data => {
      if (expectedComponent && data.component !== expectedComponent) throw new Error('This practice belongs to another skill.');
      if (!active) return;
      setAttempt(data);
      setAnswers({});
      setLoadError('');
    }).catch(error => {
      if (!active || error.code === 'ERR_CANCELED') return;
      const message = normalizeApiError(error, error.message || 'Unable to load this practice.').message;
      setLoadError(message);
      showError(message);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; mountedRef.current = false; controller.abort(); };
  }, [attemptId, expectedComponent, showError]);

  const setAnswerBatch = useCallback(update => {
    if (!attempt?.canAnswer || submitting) return;
    setAnswers(current => {
      const changes = typeof update === 'function' ? update(current) : update;
      if (!changes || !Object.keys(changes).length) return current;
      return applyLocalChanges(current, changes);
    });
  }, [attempt?.canAnswer, submitting]);

  const setAnswer = useCallback((key, answer) => setAnswerBatch({ [key]: answer }), [setAnswerBatch]);

  const revealAnswer = useCallback(async key => {
    if (revealedAnswers[key]) return revealedAnswers[key];
    try {
      const revealed = await practiceAttemptsApi.reveal(attemptId, key);
      if (mountedRef.current) setRevealedAnswers(current => ({ ...current, [key]: revealed }));
      return revealed;
    } catch (error) {
      showError(normalizeApiError(error, 'Unable to reveal this answer.').message);
      throw error;
    }
  }, [attemptId, revealedAnswers, showError]);

  const submit = useCallback(async () => {
    if (!attemptId || submitting) return null;
    setSubmitting(true);
    try {
      const result = await practiceAttemptsApi.complete(attemptId, {
        answers,
        revealedKeys: Object.keys(revealedAnswers),
      });
      if (mountedRef.current) setAttempt(current => ({ ...current, ...result, canAnswer: false }));
      return result;
    } catch (error) {
      showError(normalizeApiError(error, 'Unable to complete this practice.').message);
      throw error;
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }, [answers, attemptId, revealedAnswers, showError, submitting]);

  const abandon = useCallback(async () => {
    if (!attemptId || attempt?.status !== 'IN_PROGRESS') return { status: attempt?.status };
    const result = await practiceAttemptsApi.abandon(attemptId);
    if (mountedRef.current) setAttempt(current => ({ ...current, status: 'ABANDONED', canAnswer: false }));
    return result;
  }, [attempt?.status, attemptId]);

  const approveNavigation = useCallback(() => { navigationApprovedRef.current = true; }, []);
  const isNavigationApproved = useCallback(() => navigationApprovedRef.current, []);
  const noop = useCallback(async () => undefined, []);
  const value = useMemo(() => ({
    attemptId, attempt, paper: attempt?.paper, answers, loading, loadError, saveStatus: 'practice',
    submitting, submissionState: submitting ? 'submitting' : 'idle', timeExpired: false,
    isPractice: true, revealedAnswers, revealAnswer, abandon,
    setAnswer, setAnswerBatch, setCurrentQuestion: () => undefined, resolveSaveConflict: () => undefined, retrySave: noop,
    flush: noop, submit, reconcileSubmission: noop, approveNavigation, isNavigationApproved,
  }), [abandon, answers, approveNavigation, attempt, attemptId, isNavigationApproved, loadError, loading,
    noop, revealAnswer, revealedAnswers, setAnswer, setAnswerBatch, submit, submitting]);

  return <TestAttemptContext.Provider value={value}>
    <AttemptTimerContext.Provider value={null}>{children}</AttemptTimerContext.Provider>
  </TestAttemptContext.Provider>;
}
