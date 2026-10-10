import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import RichTextContent from '../../../components/common/RichTextContent.jsx';
import AnswerExplanation from '../../../components/common/AnswerExplanation.jsx';
import TestFooter from '../../../components/layout/TestFooter.jsx';
import AttemptScoreSummary from '../../test-attempts/components/AttemptScoreSummary.jsx';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState.jsx';
import { useAttemptPartResult, useAttemptResult } from '../../test-attempts/hooks/useAttemptResult.js';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState.js';
import { splitFormattedPassage } from '../../admin/reading/utils/richPassage.js';
import { readingReviewAnswer, readingReviewPages } from '../utils/readingResultPresentation.js';
import styles from './ReadingAttemptDetailPage.module.css';

const SCHEMA = { part: queryParam.positiveInt(1, 4), page: queryParam.positiveInt(1), question: queryParam.string() };
const statusLabels = { correct: 'Correct', wrong: 'Incorrect', skipped: 'Skipped' };
const partLabels = { 1: 'Sentence comprehension', 2: 'Text cohesion', 3: 'Opinion matching', 4: 'Long text comprehension' };

function ReviewQuestion({ row, item, partNumber, focused }) {
  const { status, selected, correct } = readingReviewAnswer(row, item);
  return <article id={row.key} className={styles.questionCard} aria-label={`Question ${row.number}`} data-focused={focused || undefined}>
    <div className={styles.questionHeading}>
      <span className={styles.questionNumber}>{row.number}</span>
      <RichTextContent value={partNumber === 4 ? 'Choose the best heading for this paragraph.' : row.prompt} />
      <span className={`${styles.statusBadge} ${styles[status]}`}>{statusLabels[status]}</span>
    </div>
    <div className={styles.answerColumn}>
      <div className={styles.answerEntry}><small>Your answer</small><div className={`${styles.answerField} ${styles[`${status}Field`]}`}>
        {selected ? <RichTextContent value={selected.text} /> : 'No answer'}
      </div></div>
      <div className={styles.answerEntry}><small>Correct answer</small><div className={styles.correctField}>
        {correct ? <RichTextContent value={correct.text} /> : 'Answer unavailable'}
      </div></div>
    </div>
    {partNumber === 1 && <div className={styles.optionsList}>{row.options.map((option, index) => <div key={option.id}
      className={`${styles.optionRow} ${option.id === correct?.id ? styles.correctOption : ''} ${option.id === selected?.id && option.id !== correct?.id ? styles.wrongOption : ''}`}>
      <span className={styles.optionLetter}>{String.fromCharCode(65 + index)}</span><RichTextContent value={option.text} />
    </div>)}</div>}
    {item?.revealed && <small className={styles.assisted}>Answer revealed during practice</small>}
    <AnswerExplanation text={item?.explanation || 'No explanation has been provided for this question.'} />
  </article>;
}

function PassageReview({ paper, partNumber, page, outcomes }) {
  if (partNumber === 1) return <section className={styles.scriptBox}><h2>Reading passage</h2><div className={styles.passage}>
    {splitFormattedPassage(paper).map((chunk, index) => {
      if (!chunk.gap) return <span key={index} dangerouslySetInnerHTML={{ __html: chunk.html }} />;
      const question = paper.questions?.find(item => item.position === chunk.gap);
      const item = outcomes.get(question?.key);
      const selected = question?.options?.find(option => option.id === item?.selectedAnswer?.optionId);
      return <span key={index} className={styles.gapAnswer}>({chunk.gap}) {selected?.text || '___'}</span>;
    })}
  </div></section>;
  if (partNumber === 2) return <section className={styles.scriptBox}><h2>{page.title}</h2>
    <div className={styles.openingSentence}><strong>Sentence 1 — given example</strong><RichTextContent value={page.openingSentence} /></div>
    <h3>Correct reading order</h3>
    <ol start={2} className={styles.orderedText}>{page.rows.map(row => {
      const { correct } = readingReviewAnswer(row, outcomes.get(row.key));
      return <li key={row.key}><RichTextContent value={correct?.text || 'Answer unavailable'} /></li>;
    })}</ol>
  </section>;
  if (partNumber === 3) return <section className={styles.scriptBox}><h2>Reading passage</h2>
    {(paper.speakers ?? []).map(speaker => <article className={styles.speaker} key={speaker.id}><h3>{speaker.name}</h3><RichTextContent value={speaker.post} /></article>)}
  </section>;
  return <section className={styles.scriptBox}><h2>{paper.title || 'Reading passage'}</h2>
    <h3>{paper.paragraphs?.find(paragraph => paragraph.key === page.rows[0]?.key)?.label || 'Paragraph'}</h3>
    <RichTextContent value={page.rows[0]?.prompt} />
  </section>;
}

export default function ReadingAttemptDetailPage() {
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
  if (summary.loading || summary.error || detail.loading || detail.error) return <AttemptPageState loading={summary.loading || detail.loading} error={summary.error || detail.error} backHref={backHref} />;
  if (!detail.data) return <AttemptPageState error="This detailed result is not available." backHref={backHref} />;
  const paper = detail.data.paper;
  const pages = readingReviewPages(paper, activePart, summary.data?.result?.items ?? []);
  if (!pages.length) return <AttemptPageState error="This detailed result is not available." backHref={backHref} />;
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
      <header className={styles.header}><div><span>{isPractice ? 'READING PRACTICE RESULT' : 'READING TEST RESULT'}</span><h1>{summary.data.title || 'Detailed answers'}</h1></div>
        <button className={styles.summaryButton} onClick={() => navigate(`/reading/result?attemptId=${encodeURIComponent(attemptId)}${isPractice ? '&practice=true' : ''}`)}>Back to result</button>
      </header>
      <AttemptScoreSummary score={summary.data.score} maxScore={summary.data.maxScore} title="Final score" subtitle="Reading" />
      {parts.length > 1 && <nav className={styles.partTabs} aria-label="Result part">{parts.map(part => <button key={part} className={activePart === part ? styles.activeTab : ''}
        aria-pressed={activePart === part} onClick={() => movePart(part)}>Part {part}</button>)}</nav>}
      <div className={styles.sectionHeader}><strong>Part {activePart} · {partLabels[activePart]}</strong>
        <span>Questions {page.rows[0].number}–{page.rows[page.rows.length - 1].number}{pages.length > 1 ? ` · Page ${currentIndex + 1}/${pages.length}` : ''}</span>
      </div>
      <div className={styles.contentRow}>
        <PassageReview paper={paper} partNumber={activePart} page={page} outcomes={outcomes} />
        <section className={styles.qaBox} aria-label="Answers and explanations">{page.rows.map(row => <ReviewQuestion key={row.key} row={row}
          item={outcomes.get(row.key)} partNumber={activePart} focused={row.key === url.question} />)}</section>
      </div>
    </main>
    <TestFooter partLabel={`Part ${activePart}`}
      questions={pages.flatMap(page => page.rows.map(row => ({ id: row.key, displayLabel: row.number })))}
      answeredIds={(detail.data.items ?? []).filter(item => item.selectedAnswer).map(item => item.key)}
      currentPageQuestionIds={page.rows.map(row => row.key)}
      onQuestionClick={key => setUrl({ page: pages.findIndex(page => page.rows.some(row => row.key === key)) + 1, question: key })}
      onPrevClick={previous} onNextClick={next} hasPrev={currentIndex > 0 || partIndex > 0} hasNext={currentIndex < pages.length - 1 || partIndex < parts.length - 1}
      onSubmitClick={() => navigate(backHref)} submitLabel="Take another test" />
  </div>;
}
