import { ArrowLeft } from 'lucide-react';
import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RichTextContent from '../../../components/common/RichTextContent';
import { countRichTextWords } from '../../../components/common/richText';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState';
import { useAttemptPartResult } from '../../test-attempts/hooks/useAttemptResult';
import { useWritingAssessmentPolling } from '../hooks/useWritingAssessmentPolling';
import WritingAssessmentStatus from '../components/assessment/WritingAssessmentStatus';
import { WritingCefr } from '../components/assessment/WritingAiSummary';
import WritingPartFeedback from '../components/assessment/WritingPartFeedback';
import WritingQuestionFeedback from '../components/assessment/WritingQuestionFeedback';
import WritingFeedbackContext from '../components/assessment/WritingFeedbackContext';
import { countWords } from '../utils/wordCount';
import { WRITING_PARTS, writingTaskFromPaper } from '../utils/writingAttemptPaper';
import styles from './WritingResultDetailPage.module.css';
import './WritingResultDetailEnhancements.css';

const views = ['student', 'ai', 'sample'];
const querySchema = {
  activePart: { ...queryParam.enum(WRITING_PARTS, 'part1'), param: 'part' },
  view: queryParam.enum(views, 'student'),
};
function ResponseCard({ index, question, item, view, feedback }) {
  const { t } = useTranslation();
  const student = item?.selectedAnswer?.kind === 'TEXT' ? item.selectedAnswer.text : '';
  const displayed =
    view === 'student'
      ? student
      : view === 'sample'
        ? (item?.sampleAnswer ?? '')
        : (feedback?.suggestedRevision ?? '');
  return (
    <article className={styles.response}>
      <header>
        <span>{index + 1}</span>
        <h3>
          <RichTextContent as="span" value={question.text} />
        </h3>
      </header>
      <div className={`${styles.answer} ${!displayed ? styles.empty : ''}`}>
        {displayed ? (
          view === 'sample' ? (
            <RichTextContent value={displayed} />
          ) : (
            displayed
          )
        ) : (
          t(`writingAi.${view === 'ai' ? 'noRevision' : view === 'sample' ? 'noSample' : 'noResponse'}`)
        )}
      </div>
      <footer>
        <span>{t(`writingAi.${view}`)}</span>
        <strong>
          {t('writingAi.words', {
            count: view === 'sample' ? countRichTextWords(displayed) : countWords(displayed),
          })}
        </strong>
      </footer>
      {view === 'student' && <WritingQuestionFeedback feedback={feedback} />}
    </article>
  );
}
export default function WritingResultDetailPage() {
  const ui = useUiTranslation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const attemptId = params.get('attemptId');
  const isPractice = params.get('practice') === 'true';
  const [urlState, setUrlState] = useUrlQueryState(querySchema);
  const assessment = useWritingAssessmentPolling(attemptId);
  const { data: summary, loading: summaryLoading, error: summaryError } = assessment;
  const isFull = summary?.scope === 'FULL_SKILL';
  const requiredPart = summary?.scope === 'PART' ? `part${summary.partNumber}` : urlState.activePart;
  const activePart = isFull ? urlState.activePart : requiredPart;
  const partNumber = summary ? Number(activePart?.replace('part', '')) : null;
  const {
    data: detail,
    loading: detailLoading,
    error: detailError,
  } = useAttemptPartResult(
    attemptId,
    partNumber,
    'WRITING',
    `${summary?.assessmentRevision ?? 0}:${summary?.gradingStatus ?? ''}`,
  );
  useEffect(() => {
    if (summary?.scope === 'PART' && urlState.activePart !== requiredPart)
      setUrlState({ activePart: requiredPart });
  }, [requiredPart, setUrlState, summary?.scope, urlState.activePart]);
  const task =
    detail?.paper && partNumber
      ? writingTaskFromPaper({ parts: { [partNumber]: detail.paper } }, `part${partNumber}`)
      : null;
  const itemByKey = useMemo(
    () => new Map((detail?.items ?? []).map((item) => [item.key, item])),
    [detail?.items],
  );
  const partFeedback = detail?.writing?.part;
  const feedbackByKey = useMemo(
    () => new Map((partFeedback?.questions ?? []).map((question) => [question.questionKey, question])),
    [partFeedback],
  );
  if (summaryLoading || detailLoading || (summaryError && !summary) || detailError)
    return (
      <AttemptPageState
        loading={summaryLoading || detailLoading}
        error={summaryError || detailError}
        backHref={isPractice ? '/writing/practice' : '/writing/tests'}
      />
    );
  if (!summary || !detail)
    return <AttemptPageState error={t('writingAi.unavailable')} backHref={isPractice ? '/writing/practice' : '/writing/tests'} />;
  return (
    <div className={styles.page}>
      <main>
        <button
          className={styles.back}
          onClick={() =>
            navigate(`/writing/result?attemptId=${attemptId}${isPractice ? '&practice=true' : ''}`)
          }
        >
          <ArrowLeft />
          {t('writingAi.back')}
        </button>
        <div className={styles.title}>
          <div>
            <span>{t('writingAi.part', { number: partNumber })}</span>
            <h1>{summary.title || t('writingAi.title')}</h1>
          </div>
        </div>
        {isFull && (
          <nav className={styles.partTabs} aria-label={t('writingAi.parts')}>
            {WRITING_PARTS.map((part, index) => (
              <button
                key={part}
                className={activePart === part ? styles.active : ''}
                onClick={() => setUrlState({ activePart: part })}
              >{ ui("Part") + ' ' }{index + 1}
              </button>
            ))}
          </nav>
        )}
        <WritingAssessmentStatus {...assessment} />
        <WritingCefr writing={summary.result?.writing} />
        <WritingFeedbackContext writing={summary.result?.writing}
          assisted={isPractice && !!summary.result?.assistance?.revealedKeys?.length} />
        <nav className={styles.viewTabs}>
          {views.map((view) => (
            <button
              key={view}
              className={urlState.view === view ? styles.active : ''}
              onClick={() => setUrlState({ view })}
            >
              {t(`writingAi.${view}`)}
            </button>
          ))}
        </nav>
        <div className={styles.layout}>
          <section className={styles.responses}>
            <div className={styles.instruction}>
              <strong>{t('writingAi.instruction')}</strong>
              <RichTextContent value={task?.instruction} />
            </div>
            {(task?.questions ?? []).map((question, index) => (
              <ResponseCard
                key={question.key}
                index={index}
                question={question}
                item={itemByKey.get(question.key)}
                view={urlState.view}
                feedback={feedbackByKey.get(question.key)}
              />
            ))}
          </section>
          <aside>
            {partFeedback ? (
              <WritingPartFeedback part={partFeedback} comment={summary.result?.writing?.summary?.partSummaries?.find(part => part.partNumber === partNumber)?.comment} />
            ) : (
              <p>{t('writingAi.pendingFeedback')}</p>
            )}
            <small>{t('writingAi.immutable')}</small>
          </aside>
        </div>
        <button
          className={styles.another}
          onClick={() => navigate(isPractice ? '/writing/practice' : '/writing/tests')}
        >
          {t('writingAi.another')}
        </button>
      </main>
    </div>
  );
}
