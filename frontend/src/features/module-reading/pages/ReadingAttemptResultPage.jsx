import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import ResultBackButton from '../../../components/common/ResultBackButton.jsx';
import AssessmentProgress from '../../test-attempts/components/AssessmentProgress.jsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState.jsx';
import { useAttemptResult } from '../../test-attempts/hooks/useAttemptResult.js';
import { formatDuration } from '../../test-attempts/utils/attemptTime.js';
import { readingFeedback, readingOverviewColumns, readingResultView } from '../utils/readingResultPresentation.js';
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
  const ui = useUiTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const attemptId = params.get('attemptId');
  const isPractice = params.get('practice') === 'true';
  const { data, loading, error } = useAttemptResult(attemptId, 'READING');
  if (loading || error) return <AttemptPageState loading={loading} error={error}  backHref={isPractice ? '/reading/practice' : '/reading/tests'} />;
  const view = readingResultView(data);
  if (!view) return <AttemptPageState error={ui("This Reading result is not available.")}  backHref={isPractice ? '/reading/practice' : '/reading/tests'} />;
  const duration = data.startedAt && data.submittedAt ? formatDuration(data.startedAt, data.submittedAt) : '--:--:--';
  const [feedbackTitle, feedbackText] = readingFeedback(view.percentage);
  const detailHref = `/reading/detail-result?attemptId=${encodeURIComponent(attemptId)}${isPractice ? '&practice=true' : ''}`;
  const assistance = data.result.assistance?.revealedKeys?.length ?? 0;
  const isFullResult = data.scope === 'FULL_SKILL'
    || (!data.scope && [1, 2, 3, 4].every(number => view.parts.some(part => part.partNumber === number)));
  const overviewColumns = readingOverviewColumns(view, { compact: isFullResult });
  const hasCefrEstimate = data.cefrEstimate?.kind === 'PRACTICE_ESTIMATE' && !!data.cefrEstimate.level;
  const showCefr = !isPractice || isFullResult;
  return <div className={styles.page}><main className={styles.contentWrap}>
      <AssessmentProgress attemptId={attemptId} data={data} />
    <header className={styles.pageHeading}><span>{isPractice ? ui("READING PRACTICE") : ui("READING TEST")}</span><h1>{data.title || ui("Reading result")}</h1></header>
    {!isPractice && (params.get('timedOut') === 'true' || data.submittedAfterExpiry) && <div className={styles.notice}>{ui("Time's up! Your answers have been automatically submitted.")}</div>}
    {isPractice && assistance > 0 && <div className={styles.notice}>{ ui("Answers were revealed for") + ' ' }{assistance}{ ' ' + ui("question(s). This is an assisted practice result.") }</div>}
    <div className={styles.topSection}>
      <section className={styles.cefrBox} aria-label={ui("Final score")}>
        <div className={styles.cefrLabel}>{showCefr ? hasCefrEstimate ? ui("Estimated CEFR") : ui("CEFR Level") : ui("Practice score")}</div>
        <div className={styles.cefrValue}>{showCefr ? data.estimatedCefr || ui("Not converted") : ui("{{value0}}/{{value1}}", {value0:(view.score),value1:(view.maximum)})}</div>
        {showCefr && <div className={styles.scoreText}>{ ui("Score:") + ' ' }{view.score}/{view.maximum}</div>}
      </section>
      <section className={styles.resultBox}><h2 className={styles.resultLabel}>{ui("Result")}</h2><div className={styles.resultContent}>
        <ScoreCircle percentage={view.percentage} />
        <dl className={styles.statsGrid}>
          <div className={styles.statRow}><dt className={styles.statLabel}>{ui("Testing time")}</dt><dd className={styles.statValueBold}>{duration}</dd></div>
          <div className={styles.statRow}><dt className={styles.statLabelCorrect}>{ui("Correct")}</dt><dd className={styles.statValue}>{view.counts.correct}{ ' ' + ui("Questions") }</dd></div>
          <div className={styles.statRow}><dt className={styles.statLabelWrong}>{ui("Wrong")}</dt><dd className={styles.statValue}>{view.counts.incorrect}{ ' ' + ui("Questions") }</dd></div>
          <div className={styles.statRow}><dt className={styles.statLabelSkip}>{ui("Skip")}</dt><dd className={styles.statValue}>{view.counts.skipped}{ ' ' + ui("Questions") }</dd></div>
        </dl>
      </div></section>
    </div>
    <section className={`${styles.detailBox} ${isFullResult ? styles.fullPracticeOverview : ''}`}><h2 className={styles.resultLabel}>{ui("Answer overview")}</h2><div className={styles.columnsWrapper}>
      {overviewColumns.map(part => <div className={`${styles.partColumn} ${!isFullResult ? styles.sentenceColumn : ''} ${isFullResult && part.partNumber === 4 ? styles.headingColumn : ''}`} key={part.key}><h3 className={styles.partTitle}>{ ui("Part") + ' ' }{part.partNumber}</h3>
        {part.items.map(item => <button className={styles.answerRow} key={item.key}
          aria-label={ui("Question {{value0}}: {{value1}}", {value0:(item.number),value1:(statusLabels[item.status])})}
          onClick={() => navigate(`${detailHref}&part=${part.partNumber}&question=${encodeURIComponent(item.key)}`)}>
          <span className={styles.qId}>{item.number}</span><span className={styles.userAns} title={item.answer}>{item.answer}</span>
          <span className={`${styles.iconWrap} ${styles[item.status]}`} aria-hidden="true">{item.status === 'correct' ? '✓' : item.status === 'wrong' ? '✕' : '—'}</span>
          {!isFullResult && <span className={`${styles.statusLabel} ${styles[item.status]}`}>{statusLabels[item.status]}</span>}
        </button>)}
      </div>)}
    </div></section>
    <section className={styles.feedbackBox}><h2 className={styles.feedbackLabel}>{ui("Feedback")}</h2><p className={styles.feedbackText}><strong style={{ color: color(view.percentage) }}>{ui(feedbackTitle)}</strong> {ui(feedbackText)}</p></section>
    <section className={styles.statsBox}><h2 className={styles.statsLabel}>{ui("Statistics")}</h2><div className={styles.circlesWrapper}>
      {view.parts.map(part => <div className={styles.circleItem} key={part.partNumber}><ScoreCircle percentage={part.percentage} small />
        <div className={styles.statName}>{ ui("Part") + ' ' }{part.partNumber}</div><strong>{part.score}/{part.maxScore}</strong></div>)}
    </div></section>
    <div className={styles.actionRow}><button className={styles.tryAgainBtn} onClick={() => navigate(detailHref)}>{ui("View detail result")}</button>
      <ResultBackButton to={isPractice ? '/reading/practice' : '/reading/tests'} /></div>
  </main></div>;
}
