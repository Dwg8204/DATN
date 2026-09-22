import { useNavigate, useSearchParams } from 'react-router-dom';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState';
import AttemptScoreSummary from '../../test-attempts/components/AttemptScoreSummary';
import { useAttemptResult } from '../../test-attempts/hooks/useAttemptResult';
import { formatDuration } from '../../test-attempts/utils/attemptTime';
import styles from './WritingResultPage.module.css';

const gradingLabels = {
  QUEUED: 'Waiting for AI assessment',
  PROCESSING: 'AI assessment in progress',
  PARTIAL_FAILED: 'Some responses could not be assessed',
  FAILED: 'Assessment could not be completed',
  COMPLETED: 'Assessment completed',
};

export default function WritingResultPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const attemptId = params.get('attemptId');
  const timedOut = params.get('timedOut') === 'true';
  const { data, loading, error } = useAttemptResult(attemptId);

  if (loading || error) return <AttemptPageState loading={loading} error={error} backHref="/writing/tests" />;
  if (!data?.result) return <AttemptPageState error="This result is not available yet." backHref="/writing/tests" />;

  const scoreReady = data.score != null && data.maxScore != null;
  const items = data.result.items ?? [];
  const skipped = items.filter(item => item.outcome === 'SKIPPED').length;
  const completedResponses = Math.max(0, items.length - skipped);
  const testType = data.scope === 'FULL_SKILL' ? 'Full Writing Test' : `Writing Part ${data.partNumber}`;
  const duration = data.startedAt && data.submittedAt ? formatDuration(data.startedAt, data.submittedAt) : '--:--:--';
  const gradingLabel = gradingLabels[data.gradingStatus] ?? 'Assessment pending';

  return <div className={styles.page}><main>
    {(timedOut || data.submittedAfterExpiry) && <div className={styles.notice}>Time expired. The responses saved on the server were submitted automatically.</div>}
    <h1>{data.title || 'The result of the Writing test'}</h1>
    {scoreReady
      ? <AttemptScoreSummary score={data.score} maxScore={data.maxScore} title="Final score" subtitle={data.estimatedCefr ? `Estimated CEFR: ${data.estimatedCefr}` : undefined} />
      : <section className={styles.pending} role="status"><span className={styles.pendingIcon} aria-hidden="true">…</span><div><h2>{gradingLabel}</h2><p>Your submitted responses are safe. A score has not been generated because the AI assessment service is not connected yet.</p></div></section>}
    <section className={styles.panel}>
      <h2>Test summary</h2>
      <dl className={styles.summaryList}>
        <div><dt>Testing time</dt><dd>{duration}</dd></div>
        <div><dt>Test type</dt><dd>{testType}</dd></div>
        <div><dt>Completed responses</dt><dd>{completedResponses}/{items.length}</dd></div>
        <div><dt>Assessment status</dt><dd>{gradingLabel}</dd></div>
      </dl>
    </section>
    <section className={styles.panel}>
      <h2>Feedback</h2>
      <p>{scoreReady ? 'Your assessment is complete. Open the detailed result to review every response.' : 'You can already review your submitted responses and the reference samples while assessment is pending.'}</p>
    </section>
    <div className={styles.actions}>
      <button onClick={() => navigate(`/writing/result-detail?attemptId=${attemptId}`)}>View detail result</button>
      <button onClick={() => navigate('/writing/tests')}>Take another test</button>
    </div>
  </main></div>;
}
