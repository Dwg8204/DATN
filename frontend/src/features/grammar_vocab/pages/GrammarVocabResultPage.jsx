import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState';
import { useAttemptResult } from '../../test-attempts/hooks/useAttemptResult';
import { formatDuration } from '../../test-attempts/utils/attemptTime';
import styles from './GrammarVocabResultPage.module.css';

function AnswerStatusIcon({ status }) {
  if (status === 'skipped') return <span className={styles.skippedIcon}>—</span>;
  if (status === 'correct') return <svg className={styles.statusIcon} viewBox="0 0 24 24" aria-label="Correct"><path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg className={`${styles.statusIcon} ${styles.wrongIcon}`} viewBox="0 0 24 24" aria-label="Incorrect"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>;
}

function ScoreRing({ percentage, size = 'large', children }) {
  return <div className={`${styles.scoreRing} ${size === 'small' ? styles.scoreRingSmall : ''}`} style={{ '--score': `${percentage * 3.6}deg` }}><div className={styles.scoreRingInner}>{children}</div></div>;
}

const statusName = outcome => outcome === 'CORRECT' ? 'correct' : outcome === 'INCORRECT' ? 'wrong' : 'skipped';

export default function GrammarVocabResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const timedOut = searchParams.get('timedOut') === 'true';
  const { data, loading, error } = useAttemptResult(attemptId);
  const view = useMemo(() => {
    if (!data?.result) return null;
    const score = Number(data.score ?? 0);
    const maximum = Number(data.maxScore ?? 0);
    const percentage = maximum ? Math.round((score / maximum) * 100) : 0;
    const items = (data.result.items ?? []).map((item, index) => ({
      ...item, number: index + 1, status: statusName(item.outcome), answer: item.outcome === 'SKIPPED' ? null : 'Answered',
    }));
    const groups = (data.result.parts ?? []).map(part => ({
      label: part.partNumber === 1 ? 'Grammar' : 'Vocabulary',
      correct: Number(part.score ?? 0), total: Number(part.maxScore ?? 0),
      percentage: part.maxScore ? Math.round((part.score / part.maxScore) * 100) : 0,
    }));
    return { score, maximum, percentage, items, groups, counts: data.result.counts,
      duration: data.startedAt && data.submittedAt ? formatDuration(data.startedAt, data.submittedAt) : '--:--:--' };
  }, [data]);

  if (loading || error) return <AttemptPageState loading={loading} error={error} />;
  if (!view) return <AttemptPageState error="This result is not available yet." />;

  const feedback = view.percentage >= 80
    ? 'You demonstrated strong grammar and vocabulary accuracy. Review the detailed answers to maintain this performance.'
    : view.percentage >= 50
      ? 'Review your incorrect answers and their explanations, then practise similar question types.'
      : 'Review the grammar rules and word meanings in the detailed result before trying another test.';

  return (
    <div className={styles.page}><div className={styles.content}>
      {(timedOut || data.submittedAfterExpiry) && <div className={styles.notice}>Time expired. The answers saved on the server were submitted automatically.</div>}
      <section className={styles.summarySection}>
        <div className={styles.bandCard}><div><h2>Raw score</h2><p>Grammar &amp; Vocabulary</p></div><div className={styles.bandValue}><strong>{view.score}/</strong><span>{view.maximum}</span></div></div>
        <div className={styles.resultCard}><h2>Result</h2><div className={styles.resultOverview}>
          <ScoreRing percentage={view.percentage}>{view.percentage}%</ScoreRing>
          <div className={styles.resultStats}>
            <div><strong>Testing time</strong><strong>{view.duration}</strong></div>
            <div><strong className={styles.correctText}>Correct</strong><span>{view.counts.correct}</span></div>
            <div><strong className={styles.wrongText}>Wrong</strong><span>{view.counts.incorrect}</span></div>
            <div><strong className={styles.skipText}>Skipped</strong><span>{view.counts.skipped}</span></div>
          </div>
        </div></div>
      </section>
      <section className={styles.panel}><h2>Answer overview</h2><div className={styles.answerGrid}>
        {view.items.map(item => <div className={styles.answerRow} key={item.key}><strong>{item.number}</strong><span>{item.answer ?? '--'}</span><AnswerStatusIcon status={item.status} /></div>)}
      </div></section>
      <section className={styles.panel}><h2>Feedback</h2><p className={styles.feedback}>{feedback}</p></section>
      <section className={styles.panel}><h2>Statistics</h2><div className={styles.statistics}>
        {view.groups.map(group => <div className={styles.statisticItem} key={group.label}><ScoreRing percentage={group.percentage} size="small"><span>{group.correct}/{group.total}</span></ScoreRing><div>{group.label}</div></div>)}
      </div></section>
      <div className={styles.actions}>
        <button className={styles.primaryButton} onClick={() => navigate(`/grammar-vocab/result-detail?attemptId=${attemptId}`)}>View detail result</button>
        <button className={styles.secondaryButton} onClick={() => navigate('/grammar-vocab/tests')}>Take another test</button>
      </div>
    </div></div>
  );
}
