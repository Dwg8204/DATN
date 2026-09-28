import { useNavigate, useSearchParams } from 'react-router-dom';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState.jsx';
import { useAttemptResult } from '../../test-attempts/hooks/useAttemptResult.js';
import { formatDuration } from '../../test-attempts/utils/attemptTime.js';
import styles from './SpeakingAttemptResultPage.module.css';

export default function SpeakingAttemptResultPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const attemptId = params.get('attemptId');
  const isPractice = params.get('practice') === 'true';
  const { data, loading, error } = useAttemptResult(attemptId, 'SPEAKING');
  if (loading || error) return <AttemptPageState loading={loading} error={error} backHref={isPractice ? '/speaking/practice' : '/speaking/tests'} />;
  if (!data?.result) return <AttemptPageState error="This Speaking result is not available." />;

  const items = data.result.items ?? [];
  const submitted = items.filter(item => item.outcome === 'PENDING').length;
  const duration = data.startedAt && data.submittedAt ? formatDuration(data.startedAt, data.submittedAt) : '--:--:--';
  return <div className={styles.page}><main>
    <div className={styles.eyebrow}>{isPractice ? 'SPEAKING PRACTICE' : 'SPEAKING TEST'}</div>
    <h1>{data.title || 'Speaking result'}</h1>
    <section className={styles.pending} role="status"><strong>Assessment pending</strong>
      <p>Your recordings have been submitted. Pronunciation, fluency and task-fulfilment scoring will appear after the AI assessment service is connected.</p></section>
    <section className={styles.summary}><h2>Submission summary</h2><dl>
      <div><dt>Responses recorded</dt><dd>{submitted}/{items.length}</dd></div>
      <div><dt>Time spent</dt><dd>{duration}</dd></div>
      <div><dt>Type</dt><dd>{data.scope === 'FULL_SKILL' ? 'Full test' : `Part ${data.partNumber}`}</dd></div>
      <div><dt>Scoring</dt><dd>Not assessed</dd></div>
    </dl></section>
    <div className={styles.actions}>
      <button onClick={() => navigate(`/speaking/detail-result?attemptId=${attemptId}${isPractice ? '&practice=true' : ''}`)}>Review responses</button>
      <button className={styles.secondary} onClick={() => navigate(isPractice ? '/speaking/practice' : '/speaking/tests')}>Take another</button>
    </div>
  </main></div>;
}
