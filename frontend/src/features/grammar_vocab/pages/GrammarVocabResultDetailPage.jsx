import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AnswerExplanation from '../../../components/common/AnswerExplanation';
import RichTextContent from '../../../components/common/RichTextContent';
import TestFooter from '../../../components/layout/TestFooter';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState';
import { useAttemptPartResult, useAttemptResult } from '../../test-attempts/hooks/useAttemptResult';
import AttemptScoreSummary from '../../test-attempts/components/AttemptScoreSummary';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState';
import styles from './GrammarVocabResultDetailPage.module.css';

const PART1_ITEMS_PER_PAGE = 3;
const DETAIL_QUERY_SCHEMA = {
  selectedPart: { ...queryParam.positiveInt(1, 4), param: 'part' },
  currentPage: { ...queryParam.positiveInt(1), param: 'page' },
};
const statusName = outcome => outcome === 'CORRECT' ? 'correct' : outcome === 'INCORRECT' ? 'wrong' : 'skipped';

function StatusBadge({ outcome }) {
  const status = statusName(outcome);
  const labels = { correct: 'Correct', wrong: 'Incorrect', skipped: 'Skipped' };
  return <span className={`${styles.statusBadge} ${styles[status]}`}>{labels[status]}</span>;
}

function Part1Review({ questions, itemMap }) {
  return <div className={styles.part1List}>{questions.map(question => {
    const item = itemMap.get(question.key);
    const selected = item?.selectedAnswer?.optionId;
    return <article className={styles.questionCard} key={question.key}>
      <div className={styles.questionHeading}><span className={styles.questionNumber}>{question.key.split('q').at(-1)}</span><RichTextContent value={question.text} /><StatusBadge outcome={item?.outcome?.outcome} /></div>
      <div className={styles.part1Options}>{question.options.map(option => {
        const correct = option.id === item?.correctAnswer;
        const wrongSelection = option.id === selected && !correct;
        return <div className={`${styles.optionRow} ${correct ? styles.correctOption : ''} ${wrongSelection ? styles.wrongOption : ''}`} key={option.id}>
          <span className={styles.optionLetter}>{String.fromCharCode(65 + Number(option.id.slice(1)))}</span><span>{option.text}</span>
        </div>;
      })}</div>
      <AnswerExplanation text={item?.explanation} />
    </article>;
  })}</div>;
}

function Part2Review({ wordSet, itemMap }) {
  return <div className={styles.part2Layout}>
    <div className={styles.matchingList}>{wordSet.targetWords.map(target => {
      const item = itemMap.get(target.key);
      const status = statusName(item?.outcome?.outcome);
      const selected = wordSet.options.find(option => option.id === item?.selectedAnswer?.optionId);
      const correct = wordSet.options.find(option => option.id === item?.correctAnswer);
      return <article className={styles.matchingItem} key={target.key}>
        <div className={styles.matchingRow}>
          <span className={styles.targetWord}>{target.word} =</span>
          <div className={`${styles.answerField} ${styles[`${status}Field`]}`}>{selected ? `${selected.id}. ${selected.text}` : 'No answer'}</div>
          <StatusBadge outcome={item?.outcome?.outcome} />
        </div>
        {status !== 'correct' && correct && <div className={styles.correctField}>{correct.id}. {correct.text}</div>}
        <AnswerExplanation text={item?.explanation} />
      </article>;
    })}</div>
    <aside className={styles.optionBank}><h2>Options</h2>{wordSet.options.map(option => <div key={option.id}><strong>{option.id}</strong><span>{option.text}</span></div>)}</aside>
  </div>;
}

export default function GrammarVocabResultDetailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const [urlState, setUrlState] = useUrlQueryState(DETAIL_QUERY_SCHEMA);
  const { selectedPart, currentPage } = urlState;
  const setCurrentPage = next => setUrlState(current => ({ currentPage: typeof next === 'function' ? next(current.currentPage) : next }));
  const summary = useAttemptResult(attemptId);
  const availableParts = useMemo(() => summary.data?.result?.parts?.map(part => part.partNumber) ?? [], [summary.data]);
  const activePart = availableParts.includes(selectedPart) ? selectedPart : availableParts[0] ?? null;
  const detail = useAttemptPartResult(attemptId, activePart);
  const paper = detail.data?.paper;
  const itemMap = useMemo(() => new Map((detail.data?.items ?? []).map(item => [item.key, item])), [detail.data]);
  const isPart1 = activePart === 1;
  const questions = paper?.questions ?? [];
  const sets = paper?.sets ?? [];
  const totalPages = isPart1 ? Math.max(1, Math.ceil(questions.length / PART1_ITEMS_PER_PAGE)) : Math.max(1, sets.length);
  const startIndex = (currentPage - 1) * PART1_ITEMS_PER_PAGE;
  const visibleQuestions = questions.slice(startIndex, startIndex + PART1_ITEMS_PER_PAGE);
  const visibleSet = sets[currentPage - 1];
  const footerQuestions = isPart1
    ? questions.map((question, index) => ({ id: question.key, displayLabel: index + 1 }))
    : sets.flatMap(set => set.targetWords).map((target, index) => ({ id: target.key, displayLabel: index + 26 }));
  const currentQuestionIds = isPart1 ? visibleQuestions.map(question => question.key) : visibleSet?.targetWords.map(target => target.key) ?? [];
  const answeredIds = (detail.data?.items ?? []).filter(item => item.selectedAnswer).map(item => item.key);

  if (summary.loading || summary.error) return <AttemptPageState loading={summary.loading} error={summary.error} />;
  if (!activePart || detail.loading || detail.error) return <AttemptPageState loading={!detail.error} error={detail.error} />;

  const changePart = part => setUrlState({ selectedPart: part, currentPage: 1 });
  const previous = () => {
    if (currentPage > 1) setCurrentPage(page => page - 1);
    else {
      const index = availableParts.indexOf(activePart);
      if (index > 0) setUrlState({ selectedPart: availableParts[index - 1], currentPage: 1 });
    }
  };
  const next = () => {
    if (currentPage < totalPages) setCurrentPage(page => page + 1);
    else {
      const index = availableParts.indexOf(activePart);
      if (index < availableParts.length - 1) setUrlState({ selectedPart: availableParts[index + 1], currentPage: 1 });
    }
  };

  return <div className={styles.page}>
    <main className={styles.content}>
      <AttemptScoreSummary score={summary.data?.score} maxScore={summary.data?.maxScore} title="Final score" subtitle="Grammar & Vocabulary" />
      {availableParts.length > 1 && <div className={styles.partTabs}>{availableParts.map(part => <button key={part} className={activePart === part ? styles.activeTab : ''} onClick={() => changePart(part)}>Part {part} · {part === 1 ? 'Grammar' : 'Vocabulary'}</button>)}</div>}
      <div className={styles.sectionHeader}>
        <strong>{isPart1 ? `Questions ${startIndex + 1}-${Math.min(startIndex + PART1_ITEMS_PER_PAGE, questions.length)}` : `Questions ${currentPage * 5 + 21}-${currentPage * 5 + 25}`}</strong>
        <span>{isPart1 ? 'Choose the correct letter, A, B or C.' : 'Review each word and its selected match.'}</span>
      </div>
      {isPart1 ? <Part1Review questions={visibleQuestions} itemMap={itemMap} /> : <Part2Review wordSet={visibleSet} itemMap={itemMap} />}
    </main>
    <TestFooter
      partLabel={`Part ${activePart}`}
      questions={footerQuestions}
      answeredIds={answeredIds}
      currentPageQuestionIds={currentQuestionIds}
      onQuestionClick={key => {
        if (isPart1) setCurrentPage(Math.floor(questions.findIndex(question => question.key === key) / PART1_ITEMS_PER_PAGE) + 1);
        else setCurrentPage(sets.findIndex(set => set.targetWords.some(target => target.key === key)) + 1);
      }}
      onPrevClick={previous}
      onNextClick={next}
      onSubmitClick={() => navigate('/grammar-vocab/tests')}
      submitLabel="Take another test"
      hasPrev={currentPage > 1 || availableParts.indexOf(activePart) > 0}
      hasNext={currentPage < totalPages || availableParts.indexOf(activePart) < availableParts.length - 1}
    />
  </div>;
}
