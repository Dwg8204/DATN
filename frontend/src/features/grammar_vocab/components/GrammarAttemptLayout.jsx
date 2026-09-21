import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TestLayout from '../../../components/layout/TestLayout.jsx';
import RoleGuard from '../../auth/components/RoleGuard.jsx';
import { TestAttemptProvider } from '../../test-attempts/context/TestAttemptContext.jsx';
import { useTestAttempt } from '../../test-attempts/context/testAttemptContextStore.js';
import { formatRemainingTime } from '../../test-attempts/utils/attemptTime.js';
import AttemptNavigationGuard from '../../test-attempts/components/AttemptNavigationGuard.jsx';

function GrammarAttemptFrame() {
  const navigate = useNavigate();
  const { attemptId, attempt, secondsLeft, submit, approveNavigation, isNavigationApproved } = useTestAttempt();
  const expiryHandled = useRef(false);

  const submitBeforeExit = useCallback(async () => {
    const result = await submit();
    if (result) approveNavigation();
    return result;
  }, [approveNavigation, submit]);

  const confirmHeaderExit = useCallback(async () => {
    const result = await submitBeforeExit();
    return result ? '/' : false;
  }, [submitBeforeExit]);

  useEffect(() => {
    if (attempt?.status === 'SUBMITTED' && attemptId) {
      navigate(`/grammar-vocab/result?attemptId=${attemptId}`, { replace: true });
    }
  }, [attempt?.status, attemptId, navigate]);

  useEffect(() => {
    if (secondsLeft !== 0 || !attempt?.canAnswer || expiryHandled.current) return;
    expiryHandled.current = true;
    submit({ expired: true })
      .then(result => { if (result) { approveNavigation(); navigate(`/grammar-vocab/result?attemptId=${attemptId}&timedOut=true`, { replace: true }); } })
      .catch(() => { expiryHandled.current = false; });
  }, [approveNavigation, attempt?.canAnswer, attemptId, navigate, secondsLeft, submit]);

  return <>
    <AttemptNavigationGuard
      active={Boolean(attempt?.canAnswer)}
      attemptId={attemptId}
      testPathPrefix="/grammar-vocab/test/"
      onSubmitBeforeLeave={submitBeforeExit}
      approveNavigation={approveNavigation}
      isNavigationApproved={isNavigationApproved}
    />
    <TestLayout headerProps={{
      timeRemaining: secondsLeft == null ? undefined : formatRemainingTime(secondsLeft),
      controlledTimer: true,
      onConfirmExit: confirmHeaderExit,
    }} />
  </>;
}

export default function GrammarAttemptLayout() {
  return (
    <RoleGuard allowedRoles={['STUDENT']}>
      <TestAttemptProvider expectedComponent="GRAMMAR_VOCAB">
        <GrammarAttemptFrame />
      </TestAttemptProvider>
    </RoleGuard>
  );
}
