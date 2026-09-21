import { useCallback, useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal.jsx';

function isSameAttemptDestination(location, attemptId, testPathPrefix) {
  if (!location.pathname.startsWith(testPathPrefix)) return false;
  return new URLSearchParams(location.search).get('attemptId') === attemptId;
}

export default function AttemptNavigationGuard({ active, attemptId, testPathPrefix, onSubmitBeforeLeave, approveNavigation, isNavigationApproved }) {
  const [busy, setBusy] = useState(false);
  const blocker = useBlocker(useCallback(({ nextLocation }) => (
    active
    && !isNavigationApproved()
    && !isSameAttemptDestination(nextLocation, attemptId, testPathPrefix)
  ), [active, attemptId, isNavigationApproved, testPathPrefix]));

  useEffect(() => {
    if (!active) return undefined;
    const warnBeforeUnload = event => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [active]);

  const confirmLeave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await onSubmitBeforeLeave();
      if (!result) return;
      approveNavigation();
      blocker.proceed();
    } catch {
      // The attempt provider already shows the actionable API error.
    } finally {
      setBusy(false);
    }
  };

  return <SubmitModal
    isOpen={blocker.state === 'blocked'}
    onBack={() => blocker.reset()}
    onNext={confirmLeave}
    message={<>Leaving this test will submit all answers currently saved.<br/><br/>You will not be able to continue this attempt after leaving.</>}
    backLabel="Stay in test"
    confirmLabel="Submit and leave"
    busy={busy}
  />;
}
