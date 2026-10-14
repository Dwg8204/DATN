import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import ResultBackButton from '../../../components/common/ResultBackButton.jsx';
import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import RichTextContent from '../../../components/common/RichTextContent.jsx';
import AnswerExplanation from '../../../components/common/AnswerExplanation.jsx';
import TestFooter from '../../../components/layout/TestFooter.jsx';
import AttemptScoreSummary from '../../test-attempts/components/AttemptScoreSummary.jsx';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState.jsx';
import { useAttemptPartResult, useAttemptResult } from '../../test-attempts/hooks/useAttemptResult.js';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState.js';
import { splitFormattedPassage } from '../../admin/reading/utils/richPassage.js';
import { readingAnswerText, readingReviewAnswer, readingReviewPages } from '../utils/readingResultPresentation.js';
import styles from './ReadingAttemptDetailPage.module.css';

const SCHEMA = { part: queryParam.positiveInt(1, 4), page: queryParam.positiveInt(1), question: queryParam.string() };
const statusLabels = { correct: 'Correct', wrong: 'Incorrect', skipped: 'Skipped' };
const partLabels = { 1: 'Sentence comprehension', 2: 'Text cohesion', 3: 'Opinion matching', 4: 'Long text comprehension' };

function ReviewQuestion({ row, item, partNumber, focused }) {
  const ui = useUiTranslation();
  const { status, selected, correct } = readingReviewAnswer(row, item);
  const explanation = item?.explanation || 'No explanation has been provided for this question.';
  return <article id={row.key} className={`${styles.questionCard} ${styles.matchingPracticeCard} ${partNumber === 4 ? styles.partFourPracticeCard : ''}`} aria-label={ui("Question {{value0}}", {value0:(row.number)})} data-focused={focused || undefined}>
    <div className={styles.questionHeading}>
      <span className={styles.questionNumber}>{row.number}</span>
      <RichTextContent value={partNumber === 4 ? row.label || 'Choose the best heading for this paragraph.' : row.prompt} />
      <span className={`${styles.statusBadge} ${styles[status]}`}>{statusLabels[status]}</span>
    </div>
    <div className={styles.answerColumn}>
      <div className={styles.answerEntry}><small>{ui("Your answer")}</small><div className={`${styles.answerField} ${styles[`${status}Field`]}`}>
        {selected ? <RichTextContent value={selected.text} /> : ui("No answer")}
      </div></div>
      <div className={styles.answerEntry}><small>{ui("Correct answer")}</small><div className={styles.correctField}>
        {correct ? <RichTextContent value={correct.text} /> : ui("Answer unavailable")}
      </div></div>
    </div>
    {item?.revealed && <small className={styles.assisted}>{ui("Answer revealed during practice")}</small>}
    <section className={styles.explanationBlock} aria-label={ui("Answer explanation")}>
      <AnswerExplanation text={explanation} open />
    </section>
  </article>;
}

function PassageReview({ paper, partNumber, page, outcomes }) {
  const ui = useUiTranslation();
  if (partNumber === 1) return <section className={styles.scriptBox}><h2>{ui("Reading passage")}</h2><div className={styles.passage}>
    {splitFormattedPassage(paper).map((chunk, index) => {
      if (!chunk.gap) return <span key={index} dangerouslySetInnerHTML={{ __html: chunk.html }} />;
      const question = paper.questions?.find(item => item.position === chunk.gap);
      const item = outcomes.get(question?.key);
      const selected = question?.options?.find(option => option.id === item?.selectedAnswer?.optionId);
      return <span key={index} className={styles.gapAnswer}>({chunk.gap}) {readingAnswerText(selected?.text) || '___'}</span>;
    })}
  </div></section>;
  if (partNumber === 2) return <section className={styles.scriptBox}><h2>{ui(page.title)}</h2>
    <div className={styles.openingSentence}><strong>{ui("Sentence 1 — given example")}</strong><RichTextContent value={page.openingSentence} /></div>
    <h3>{ui("Correct reading order")}</h3>
    <ol start={2} className={styles.orderedText}>{page.rows.map(row => {
      const { correct } = readingReviewAnswer(row, outcomes.get(row.key));
      return <li key={row.key}><RichTextContent value={correct?.text || 'Answer unavailable'} /></li>;
    })}</ol>
  </section>;
  if (partNumber === 3) return <section className={styles.scriptBox}><h2>{ui("Reading passage")}</h2>
    {(paper.speakers ?? []).map(speaker => <article className={styles.speaker} key={speaker.id}><h3>{speaker.name}</h3><RichTextContent value={speaker.post} /></article>)}
  </section>;
  return <section className={styles.scriptBox}><h2>{paper.title || ui("Reading passage")}</h2>
    {page.rows.map(row => <article className={styles.speaker} key={row.key}>
      <h3>{row.label || ui("Paragraph")}</h3><RichTextContent value={row.prompt} />
    </article>)}
  </section>;
}

export default function ReadingAttemptDetailPage() {
  const ui = useUiTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const attemptId = params.get('attemptId');
  const isPractice = params.get('practice') === 'true';
  const backHref = isPractice ? '/reading/practice' : '/reading/tests';
  const [url, setUrl] = useUrlQueryState(SCHEMA);
  const summary = useAttemptResult(attemptId, 'READING');
  const parts = useMemo(() => (summary.data?.result?.parts ?? []).map(item => item.partNumber).sort((a, b) => a - b), [summary.data]);
  const activePart = parts.includes(url.part) ? url.part : parts[0];
  const detail = useAttemptPartResult(attemptId, activePart, 'READING');
  const outcomes = useMemo(() => new Map((detail.data?.items ?? []).map(item => [item.key, item])), [detail.data]);
  useEffect(() => {
    if (activePart === 4 && !detail.loading && url.question) {
      document.getElementById(url.question)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activePart, detail.loading, detail.data, url.question]);
  if (summary.loading || summary.error || detail.loading || detail.error) return <AttemptPageState loading={summary.loading || detail.loading} error={summary.error || detail.error} backHref={backHref} />;
  if (!detail.data) return <AttemptPageState error={ui("This detailed result is not available.")} backHref={backHref} />;
  const paper = detail.data.paper;
  const pages = readingReviewPages(paper, activePart, summary.data?.result?.items ?? [], { singlePage: activePart === 4 });
  if (!pages.length) return <AttemptPageState error={ui("This detailed result is not available.")} backHref={backHref} />;
  const targetedPage = pages.findIndex(page => page.rows.some(row => row.key === url.question));
  const currentIndex = targetedPage >= 0 ? targetedPage : Math.min(url.page, pages.length) - 1;
  const page = pages[currentIndex];
  const partIndex = parts.indexOf(activePart);
  const movePage = nextPage => setUrl({ page: nextPage, question: '' });
  const movePart = part => setUrl({ part, page: 1, question: '' });
  const previous = () => currentIndex > 0 ? movePage(currentIndex) : partIndex > 0 && movePart(parts[partIndex - 1]);
  const next = () => currentIndex < pages.length - 1 ? movePage(currentIndex + 2) : partIndex < parts.length - 1 && movePart(parts[partIndex + 1]);
  return <div className={styles.page}>
    <main className={styles.content}>
      <header className={styles.header}><div><span>{isPractice ? ui("READING PRACTICE RESULT") : ui("READING TEST RESULT")}</span><h1>{summary.data.title || ui("Detailed answers")}</h1></div>
        <ResultBackButton to={`/reading/result?attemptId=${encodeURIComponent(attemptId)}${isPractice ? '&practice=true' : ''}`} />
      </header>
      <AttemptScoreSummary score={summary.data.score} maxScore={summary.data.maxScore} title={ui("Final score")} subtitle={ui("Reading")} />
      {parts.length > 1 && <nav className={styles.partTabs} aria-label={ui("Result part")}>{parts.map(part => <button key={part} className={activePart === part ? styles.activeTab : ''}
        aria-pressed={activePart === part} onClick={() => movePart(part)}>{ ui("Part") + ' ' }{part}</button>)}</nav>}
      <div className={styles.sectionHeader}><strong>{ ui("Part") + ' ' }{activePart} · {partLabels[activePart]}</strong>
        <span>{ ui("Questions") + ' ' }{page.rows[0].number}–{page.rows[page.rows.length - 1].number}{pages.length > 1 ? ui("· Page {{value0}}/{{value1}}", {value0:(currentIndex + 1),value1:(pages.length)}) : ''}</span>
      </div>
      <div className={`${styles.contentRow} ${styles.matchingPracticeLayout}`}>
        <PassageReview paper={paper} partNumber={activePart} page={page} outcomes={outcomes} />
        <section className={styles.qaBox} aria-label={ui("Answers and explanations")}>{page.rows.map(row => <ReviewQuestion key={row.key} row={row}
          item={outcomes.get(row.key)} partNumber={activePart} focused={row.key === url.question} />)}</section>
      </div>
    </main>
    <TestFooter partLabel={ui("Part {{value0}}", {value0:(activePart)})}
      questions={pages.flatMap(page => page.rows.map(row => ({ id: row.key, displayLabel: row.number })))}
      answeredIds={(detail.data.items ?? []).filter(item => item.selectedAnswer).map(item => item.key)}
      currentPageQuestionIds={page.rows.map(row => row.key)}
      onQuestionClick={key => setUrl({ page: pages.findIndex(page => page.rows.some(row => row.key === key)) + 1, question: key })}
      onPrevClick={previous} onNextClick={next} hasPrev={currentIndex > 0 || partIndex > 0} hasNext={currentIndex < pages.length - 1 || partIndex < parts.length - 1}
      onSubmitClick={() => navigate(backHref)} submitLabel={ui("Take another test")} />
  </div>;
}
