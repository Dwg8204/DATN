import { useEffect, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import RichTextContent from '../../../components/common/RichTextContent';
import { countRichTextWords } from '../../../components/common/richText';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState';
import AttemptScoreSummary from '../../test-attempts/components/AttemptScoreSummary';
import { useAttemptPartResult, useAttemptResult } from '../../test-attempts/hooks/useAttemptResult';
import { countWords } from '../utils/wordCount';
import { WRITING_PARTS, writingTaskFromPaper } from '../utils/writingAttemptPaper';
import styles from './WritingResultDetailPage.module.css';
import './WritingResultDetailEnhancements.css';

const views = [
  { key: 'student', label: 'Your Answer' },
  { key: 'ai', label: 'AI Answer' },
  { key: 'sample', label: 'Sample Answer' },
];
const DETAIL_QUERY_SCHEMA = {
  activePart: { ...queryParam.enum(WRITING_PARTS, 'part1'), param: 'part' },
  view: queryParam.enum(views.map(item => item.key), 'student'),
};

function ResponseCard({ index, question, item, view, assessmentPending }) {
  const studentAnswer = item?.selectedAnswer?.kind === 'TEXT' ? item.selectedAnswer.text : '';
  const sampleAnswer = item?.sampleAnswer ?? '';
  const aiAnswer = item?.aiAnswer ?? '';
  const displayed = view === 'student' ? studentAnswer : view === 'sample' ? sampleAnswer : aiAnswer;
  const emptyMessage = view === 'ai' && assessmentPending
    ? 'AI assessment is not available yet.'
    : view === 'sample'
      ? 'No reference answer was provided for this response.'
      : 'No answer was submitted.';
  const footerLabel = view === 'student' ? 'Submitted response' : view === 'sample' ? 'Reference answer' : 'AI suggestion';

  return <article className={styles.response}>
    <header><span>{index + 1}</span><h3><RichTextContent as="span" value={question.text} /></h3></header>
    <div className={`${styles.answer} ${!displayed ? styles.empty : ''}`}>
      {displayed
        ? view === 'sample' ? <RichTextContent value={displayed} /> : displayed
        : emptyMessage}
    </div>
    <footer><span>{footerLabel}</span><strong>{view === 'sample' ? countRichTextWords(displayed) : countWords(displayed)} words</strong></footer>
  </article>;
}

export default function WritingResultDetailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const attemptId = params.get('attemptId');
  const isPractice = params.get('practice') === 'true';
  const [urlState, setUrlState] = useUrlQueryState(DETAIL_QUERY_SCHEMA);
  const { data: summary, loading: summaryLoading, error: summaryError } = useAttemptResult(attemptId, 'WRITING');
  const isFull = summary?.scope === 'FULL_SKILL';
  const requiredPart = summary?.scope === 'PART' ? `part${summary.partNumber}` : urlState.activePart;
  const activePart = isFull ? urlState.activePart : requiredPart;
  const partNumber = summary ? Number(activePart?.replace('part', '')) : null;
  const { data: detail, loading: detailLoading, error: detailError } = useAttemptPartResult(attemptId, partNumber, 'WRITING');

  useEffect(() => {
    if (summary?.scope === 'PART' && urlState.activePart !== requiredPart) {
      setUrlState({ activePart: requiredPart });
    }
  }, [requiredPart, setUrlState, summary?.scope, urlState.activePart]);

  const task = detail?.paper && partNumber
    ? writingTaskFromPaper({ parts: { [partNumber]: detail.paper } }, `part${partNumber}`) : null;
  const questions = task?.questions ?? [];
  const itemByKey = useMemo(() => new Map((detail?.items ?? []).map(item => [item.key, item])), [detail?.items]);

  if (summaryLoading || detailLoading || summaryError || detailError) {
    return <AttemptPageState loading={summaryLoading || detailLoading} error={summaryError || detailError} backHref="/writing/tests" />;
  }
  if (!summary || !detail) return <AttemptPageState error="This result is not available." backHref="/writing/tests" />;

  const assessmentPending = ['QUEUED', 'PROCESSING', 'NOT_STARTED'].includes(summary.gradingStatus);
  const scoreReady = summary.score != null && summary.maxScore != null;

  return <div className={styles.page}><main>
    <button className={styles.back} onClick={() => navigate(`/writing/result?attemptId=${attemptId}${isPractice ? '&practice=true' : ''}`)}><ArrowLeft />Back</button>
    <div className={styles.title}><div><span>WRITING RESULT · PART {partNumber}</span><h1>{summary.title || `Writing Part ${partNumber}`}</h1></div><strong>{scoreReady ? `${summary.score}/${summary.maxScore}` : 'Pending'}</strong></div>
    {isFull && <nav className={styles.partTabs} aria-label="Writing result parts">{WRITING_PARTS.map((part, index) =>
      <button key={part} className={activePart === part ? styles.active : ''} onClick={() => setUrlState({ activePart: part })}>Part {index + 1}</button>)}</nav>}
    {scoreReady
      ? <AttemptScoreSummary score={summary.score} maxScore={summary.maxScore} title="Final score" subtitle={summary.estimatedCefr ? `Estimated CEFR: ${summary.estimatedCefr}` : undefined} />
      : <section className={styles.report}><div><h2>Assessment pending</h2><p>Your submitted response is stored safely. AI scoring and detailed feedback have not been connected yet.</p></div></section>}
    <nav className={styles.viewTabs}>{views.map(item =>
      <button key={item.key} className={urlState.view === item.key ? styles.active : ''} onClick={() => setUrlState({ view: item.key })}>{item.label}</button>)}</nav>
    <div className={styles.layout}>
      <section className={styles.responses}>
        <div className={styles.instruction}><strong>Instruction</strong><RichTextContent value={task?.instruction} /></div>
        {questions.map((question, index) => <ResponseCard key={question.key} index={index} question={question}
          item={itemByKey.get(question.key)} view={urlState.view} assessmentPending={assessmentPending} />)}
      </section>
      <aside><h2>Detailed feedback</h2>
        {assessmentPending
          ? <p>Detailed feedback will appear here after the Writing assessment service is implemented.</p>
          : <p>{summary.result?.feedback || 'No detailed feedback is available for this assessment.'}</p>}
        <small>The answer shown under “Your Answer” is the immutable response submitted for this attempt.</small>
      </aside>
    </div>
    <button className={styles.another} onClick={() => navigate(isPractice ? '/writing/practice' : '/writing/tests')}>Take another test</button>
  </main></div>;
}
