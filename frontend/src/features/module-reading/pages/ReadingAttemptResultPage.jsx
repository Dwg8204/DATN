import { useNavigate, useSearchParams } from 'react-router-dom';
import AttemptScoreSummary from '../../test-attempts/components/AttemptScoreSummary.jsx';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState.jsx';
import { useAttemptResult } from '../../test-attempts/hooks/useAttemptResult.js';
import { formatDuration } from '../../test-attempts/utils/attemptTime.js';
import styles from './ReadingAttemptResultPage.module.css';

export default function ReadingAttemptResultPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const attemptId = params.get('attemptId');
  const isPractice = params.get('practice') === 'true';
  const { data, loading, error } = useAttemptResult(attemptId, 'READING');
  if (loading || error) return <AttemptPageState loading={loading} error={error} />;
  if (!data?.result) return <AttemptPageState error="This Reading result is not available." />;
  const counts = data.result.counts;
  const duration = data.startedAt && data.submittedAt ? formatDuration(data.startedAt, data.submittedAt) : '--:--:--';
  return <div className={styles.page}><main>
    <div className={styles.eyebrow}>{isPractice ? 'READING PRACTICE' : 'READING TEST'}</div><h1>{data.title || 'Reading result'}</h1>
    <AttemptScoreSummary score={data.score} maxScore={data.maxScore} title="Final score"
      subtitle={!isPractice && data.estimatedCefr ? `Estimated CEFR: ${data.estimatedCefr}` : undefined} />
    <section><h2>Summary</h2><dl>
      <div><dt>Correct</dt><dd>{counts.correct}</dd></div><div><dt>Incorrect</dt><dd>{counts.incorrect}</dd></div>
      <div><dt>Skipped</dt><dd>{counts.skipped}</dd></div><div><dt>Time spent</dt><dd>{duration}</dd></div>
    </dl></section>
    <div className={styles.actions}><button onClick={() => navigate(`/reading/detail-result?attemptId=${attemptId}${isPractice ? '&practice=true' : ''}`)}>View detail result</button>
      <button className={styles.secondary} onClick={() => navigate(isPractice ? '/reading/practice' : '/reading/tests')}>Take another</button></div>
  </main></div>;
}
