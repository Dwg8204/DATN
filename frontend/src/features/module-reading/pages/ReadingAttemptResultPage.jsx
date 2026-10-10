import { useNavigate, useSearchParams } from 'react-router-dom';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState.jsx';
import { useAttemptResult } from '../../test-attempts/hooks/useAttemptResult.js';
import { formatDuration } from '../../test-attempts/utils/attemptTime.js';
import { readingFeedback, readingResultView } from '../utils/readingResultPresentation.js';
import styles from './ReadingAttemptResultPage.module.css';

const color = percentage => percentage >= 75 ? '#43b75d' : percentage >= 40 ? '#f5a623' : '#da1e21';
const statusLabels = { correct: 'Correct', wrong: 'Incorrect', skipped: 'Skipped' };

function ScoreCircle({ percentage, small = false }) {
  const size = small ? 80 : 100, radius = small ? 36 : 46, circumference = 2 * Math.PI * radius;
  return <div className={small ? styles.statCircleWrap : styles.percentageCircle}>
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="white" stroke="#e0e0e0" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke={color(percentage)} strokeWidth="4"
        strokeDasharray={`${percentage / 100 * circumference} ${circumference}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
    <div className={small ? styles.statPercentageText : styles.percentageText}>{percentage}%</div>
  </div>;
}

export default function ReadingAttemptResultPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const attemptId = params.get('attemptId');
  const isPractice = params.get('practice') === 'true';
  const { data, loading, error } = useAttemptResult(attemptId, 'READING');
  if (loading || error) return <AttemptPageState loading={loading} error={error} />;
  const view = readingResultView(data);
  if (!view) return <AttemptPageState error="This Reading result is not available." />;
  const duration = data.startedAt && data.submittedAt ? formatDuration(data.startedAt, data.submittedAt) : '--:--:--';
  const [feedbackTitle, feedbackText] = readingFeedback(view.percentage);
  const detailHref = `/reading/detail-result?attemptId=${encodeURIComponent(attemptId)}${isPractice ? '&practice=true' : ''}`;
  const assistance = data.result.assistance?.revealedKeys?.length ?? 0;
  return <div className={styles.page}><main className={styles.contentWrap}>
    <header className={styles.pageHeading}><span>{isPractice ? 'READING PRACTICE' : 'READING TEST'}</span><h1>{data.title || 'Reading result'}</h1></header>
    {!isPractice && (params.get('timedOut') === 'true' || data.submittedAfterExpiry) && <div className={styles.notice}>Time's up! Your answers have been automatically submitted.</div>}
    {isPractice && assistance > 0 && <div className={styles.notice}>Answers were revealed for {assistance} question(s). This is an assisted practice result.</div>}
    <div className={styles.topSection}>
      <section className={styles.cefrBox} aria-label="Final score">
        <div className={styles.cefrLabel}>{isPractice ? 'Practice score' : 'CEFR Level'}</div>
        <div className={styles.cefrValue}>{isPractice ? `${view.score}/${view.maximum}` : data.estimatedCefr || 'Not converted'}</div>
        {!isPractice && <div className={styles.scoreText}>Score: {view.score}/{view.maximum}</div>}
      </section>
      <section className={styles.resultBox}><h2 className={styles.resultLabel}>Result</h2><div className={styles.resultContent}>
        <ScoreCircle percentage={view.percentage} />
        <dl className={styles.statsGrid}>
          <div className={styles.statRow}><dt className={styles.statLabel}>Testing time</dt><dd className={styles.statValueBold}>{duration}</dd></div>
          <div className={styles.statRow}><dt className={styles.statLabelCorrect}>Correct</dt><dd className={styles.statValue}>{view.counts.correct} questions</dd></div>
          <div className={styles.statRow}><dt className={styles.statLabelWrong}>Wrong</dt><dd className={styles.statValue}>{view.counts.incorrect} questions</dd></div>
          <div className={styles.statRow}><dt className={styles.statLabelSkip}>Skip</dt><dd className={styles.statValue}>{view.counts.skipped} questions</dd></div>
        </dl>
      </div></section>
    </div>
    <section className={styles.detailBox}><h2 className={styles.resultLabel}>Answer overview</h2><div className={styles.columnsWrapper}>
      {view.parts.map(part => <div className={styles.partColumn} key={part.partNumber}><h3 className={styles.partTitle}>Part {part.partNumber}</h3>
        {view.items.filter(item => item.partNumber === part.partNumber).map(item => <button className={styles.answerRow} key={item.key}
          aria-label={`Question ${item.number}: ${statusLabels[item.status]}`}
          onClick={() => navigate(`${detailHref}&part=${part.partNumber}&question=${encodeURIComponent(item.key)}`)}>
          <span className={styles.qId}>{item.number}</span><span className={styles.userAns}>{item.answer}</span>
          <span className={`${styles.iconWrap} ${styles[item.status]}`} aria-hidden="true">{item.status === 'correct' ? '✓' : item.status === 'wrong' ? '✕' : '—'}</span>
        </button>)}
      </div>)}
    </div></section>
    <section className={styles.feedbackBox}><h2 className={styles.feedbackLabel}>Feedback</h2><p className={styles.feedbackText}><strong style={{ color: color(view.percentage) }}>{feedbackTitle}</strong> {feedbackText}</p></section>
    <section className={styles.statsBox}><h2 className={styles.statsLabel}>Statistics</h2><div className={styles.circlesWrapper}>
      {view.parts.map(part => <div className={styles.circleItem} key={part.partNumber}><ScoreCircle percentage={part.percentage} small />
        <div className={styles.statName}>Part {part.partNumber}</div><strong>{part.score}/{part.maxScore}</strong></div>)}
    </div></section>
    <div className={styles.actionRow}><button className={styles.tryAgainBtn} onClick={() => navigate(detailHref)}>View detail result</button>
      <button className={styles.backBtn} onClick={() => navigate(isPractice ? '/reading/practice' : '/reading/tests')}>Back to tests</button></div>
  </main></div>;
}
