import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TestLayout from '../../../components/layout/TestLayout.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import AttemptNavigationGuard from './AttemptNavigationGuard.jsx';
import { useAttemptTimer, useTestAttempt } from '../context/testAttemptContextStore.js';
import { formatRemainingTime } from '../utils/attemptTime.js';
import styles from './SharedAttemptFrame.module.css';
import DictionaryPopover from '../../practice/components/DictionaryPopover.jsx';
import { useTranslation } from 'react-i18next';

const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));
const MAX_RECONCILIATION_CHECKS = 5;

export default function SharedAttemptFrame({ resultPath, testPathPrefix }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showError } = useToast();
  const secondsLeft = useAttemptTimer();
  const { attemptId, attempt, submit, abandon, reconcileSubmission, submissionState, approveNavigation, isNavigationApproved, isPractice } = useTestAttempt();
  const [recoveryPaused, setRecoveryPaused] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const recoveryStartedRef = useRef(false);
  const leavingRef = useRef(false);
  const isExpired = secondsLeft === 0 || (attempt?.status === 'IN_PROGRESS' && attempt?.canAnswer === false);
  const needsRecovery = attempt?.status === 'IN_PROGRESS' && (isExpired || submissionState === 'verifying');

  const retryRecovery = useCallback(() => {
    recoveryStartedRef.current = false;
    setRecoveryPaused(false);
    setRetryKey(current => current + 1);
  }, []);

  const submitBeforeExit = useCallback(async () => {
    leavingRef.current = true;
    try {
      const result = isPractice ? await abandon() : await submit({ expired: isExpired });
      if (result) approveNavigation();
      else leavingRef.current = false;
      return result;
    } catch (error) {
      leavingRef.current = false;
      throw error;
    }
  }, [abandon, approveNavigation, isExpired, isPractice, submit]);

  const confirmHeaderExit = useCallback(async () => {
    const result = await submitBeforeExit();
    return result ? '/' : false;
  }, [submitBeforeExit]);

  useEffect(() => {
    if (!isPractice && attempt?.status === 'SUBMITTED' && attemptId && !leavingRef.current && !isNavigationApproved()) {
      approveNavigation();
      navigate(`${resultPath}?attemptId=${attemptId}${isExpired ? '&timedOut=true' : ''}`, { replace: true });
    }
  }, [approveNavigation, attempt?.status, attemptId, isExpired, isNavigationApproved, isPractice, navigate, resultPath]);

  useEffect(() => {
    if (isPractice || !needsRecovery || recoveryPaused || recoveryStartedRef.current) return undefined;
    let cancelled = false;
    recoveryStartedRef.current = true;

    const recover = async () => {
      for (let index = 0; index < MAX_RECONCILIATION_CHECKS && !cancelled; index += 1) {
        try {
          const result = isExpired ? await submit({ expired: true }) : await reconcileSubmission();
          if (result || cancelled) return;
        } catch {
          // A failed request does not change the server-side submission state.
        }
        if (index < MAX_RECONCILIATION_CHECKS - 1 && !cancelled) {
          await wait(Math.min(1_000 * (2 ** index), 8_000));
        }
      }
      if (!cancelled) {
        recoveryStartedRef.current = false;
        setRecoveryPaused(true);
        showError('Could not verify whether this test was submitted. Reconnect and try again.');
      }
    };
    void recover();
    return () => { cancelled = true; recoveryStartedRef.current = false; };
  }, [isExpired, isPractice, needsRecovery, reconcileSubmission, recoveryPaused, retryKey, showError, submit]);

  useEffect(() => {
    if (!needsRecovery) return undefined;
    window.addEventListener('online', retryRecovery);
    return () => window.removeEventListener('online', retryRecovery);
  }, [needsRecovery, retryRecovery]);

  return <>
    <DictionaryPopover active={Boolean(isPractice && attempt?.status === 'IN_PROGRESS')} />
    <AttemptNavigationGuard
      active={attempt?.status === 'IN_PROGRESS'}
      attemptId={attemptId}
      testPathPrefix={testPathPrefix}
      onSubmitBeforeLeave={submitBeforeExit}
      approveNavigation={approveNavigation}
      isNavigationApproved={isNavigationApproved}
      message={isPractice ? t('practice.exitMessage') : undefined}
      confirmLabel={isPractice ? t('practice.leave') : 'Submit and leave'}
      backLabel={isPractice ? t('practice.stay') : 'Stay in test'}
    />
    {needsRecovery && <div className={styles.recovery} role="status">
      <span>{recoveryPaused ? 'Submission not verified. Your test is locked until its status is confirmed.'
        : 'Checking the submitted test with the server…'}</span>
      {recoveryPaused && <button type="button" onClick={retryRecovery}>Try again</button>}
    </div>}
    <TestLayout headerProps={{
      timeRemaining: secondsLeft == null ? undefined : formatRemainingTime(secondsLeft),
      controlledTimer: true,
      showTimer: !isPractice,
      onConfirmExit: confirmHeaderExit,
      finalizingExpired: needsRecovery,
      exitMode: isPractice ? 'practice' : 'exam',
    }} />
  </>;
}
