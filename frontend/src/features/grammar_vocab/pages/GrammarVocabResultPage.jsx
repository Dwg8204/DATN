import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import ResultBackButton from '../../../components/common/ResultBackButton.jsx';
import AssessmentProgress from '../../test-attempts/components/AssessmentProgress.jsx';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState';
import { useAttemptResult } from '../../test-attempts/hooks/useAttemptResult';
import { formatDuration } from '../../test-attempts/utils/attemptTime';
import { displaySelectedAnswer } from '../../test-attempts/utils/answerDisplay';
import styles from './GrammarVocabResultPage.module.css';

function AnswerStatusIcon({ status }) {
  const ui = useUiTranslation();
  if (status === 'skipped') return <span className={styles.skippedIcon}>—</span>;
  if (status === 'correct') return <svg className={styles.statusIcon} viewBox="0 0 24 24" aria-label={ui("Correct")}><path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg className={`${styles.statusIcon} ${styles.wrongIcon}`} viewBox="0 0 24 24" aria-label={ui("Incorrect")}><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>;
}

function ScoreRing({ percentage, size = 'large', children }) {
  return <div className={`${styles.scoreRing} ${size === 'small' ? styles.scoreRingSmall : ''}`} style={{ '--score': `${percentage * 3.6}deg` }}><div className={styles.scoreRingInner}>{children}</div></div>;
}

const statusName = outcome => outcome === 'CORRECT' ? 'correct' : outcome === 'INCORRECT' ? 'wrong' : 'skipped';

export default function GrammarVocabResultPage() {
  const ui = useUiTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const isPractice = searchParams.get('practice') === 'true';
  const timedOut = searchParams.get('timedOut') === 'true';
  const { data, loading, error } = useAttemptResult(attemptId, 'GRAMMAR_VOCAB');
  const view = useMemo(() => {
    if (!data?.result) return null;
    const score = Number(data.score ?? 0);
    const maximum = Number(data.maxScore ?? 0);
    const percentage = maximum ? Math.round((score / maximum) * 100) : 0;
    const items = (data.result.items ?? []).map((item, index) => ({
      ...item, number: index + 1, status: statusName(item.outcome),
      answer: displaySelectedAnswer(item.selectedAnswer),
    }));
    const groups = (data.result.parts ?? []).map(part => ({
      label: part.partNumber === 1 ? 'Grammar' : 'Vocabulary',
      correct: Number(part.score ?? 0), total: Number(part.maxScore ?? 0),
      percentage: part.maxScore ? Math.round((part.score / part.maxScore) * 100) : 0,
    }));
    return { score, maximum, percentage, items, groups, counts: data.result.counts,
      duration: data.startedAt && data.submittedAt ? formatDuration(data.startedAt, data.submittedAt) : '--:--:--' };
  }, [data]);

  if (loading || error) return <AttemptPageState loading={loading} error={error}  backHref={isPractice ? '/grammar-vocab/practice' : '/grammar-vocab/tests'} />;
  if (!view) return <AttemptPageState error={ui("This result is not available yet.")}  backHref={isPractice ? '/grammar-vocab/practice' : '/grammar-vocab/tests'} />;

  const feedback = view.percentage >= 80
    ? 'You demonstrated strong grammar and vocabulary accuracy. Review the detailed answers to maintain this performance.'
    : view.percentage >= 50
      ? 'Review your incorrect answers and their explanations, then practise similar question types.'
      : 'Review the grammar rules and word meanings in the detailed result before trying another test.';

  return (
    <div className={styles.page}><div className={styles.content}>
      {(timedOut || data.submittedAfterExpiry) && <div className={styles.notice}>{ui("Time expired. The answers saved on the server were submitted automatically.")}</div>}
      <AssessmentProgress attemptId={attemptId} data={data} />
      <section className={styles.summarySection}>
        <div className={styles.bandCard}><div><h2>{ui("Raw score")}</h2><p>{ui("Grammar & Vocabulary")}</p></div><div className={styles.bandValue}><strong>{view.score}/</strong><span>{view.maximum}</span></div></div>
        <div className={styles.resultCard}><h2>{ui("Result")}</h2><div className={styles.resultOverview}>
          <ScoreRing percentage={view.percentage}>{view.percentage}%</ScoreRing>
          <div className={styles.resultStats}>
            <div><strong>{ui("Testing time")}</strong><strong>{view.duration}</strong></div>
            <div><strong className={styles.correctText}>{ui("Correct")}</strong><span>{view.counts.correct}</span></div>
            <div><strong className={styles.wrongText}>{ui("Wrong")}</strong><span>{view.counts.incorrect}</span></div>
            <div><strong className={styles.skipText}>{ui("Skipped")}</strong><span>{view.counts.skipped}</span></div>
          </div>
        </div></div>
      </section>
      <section className={styles.panel}><h2>{ui("Answer overview")}</h2><div className={styles.answerGrid}>
        {view.items.map(item => <div className={styles.answerRow} key={item.key}><strong>{item.number}</strong><span>{item.answer ?? '--'}</span><AnswerStatusIcon status={item.status} /></div>)}
      </div></section>
      <section className={styles.panel}><h2>{ui("Feedback")}</h2><p className={styles.feedback}>{ui(feedback)}</p></section>
      <section className={styles.panel}><h2>{ui("Statistics")}</h2><div className={styles.statistics}>
        {view.groups.map(group => <div className={styles.statisticItem} key={group.label}><ScoreRing percentage={group.percentage} size="small"><span>{group.correct}/{group.total}</span></ScoreRing><div>{ui(group.label)}</div></div>)}
      </div></section>
      <div className={styles.actions}>
        <button className={styles.primaryButton} onClick={() => navigate(`/grammar-vocab/result-detail?attemptId=${attemptId}${isPractice ? '&practice=true' : ''}`)}>{ui("View detail result")}</button>
        <ResultBackButton to={isPractice ? '/grammar-vocab/practice' : '/grammar-vocab/tests'} />
      </div>
    </div></div>
  );
}
