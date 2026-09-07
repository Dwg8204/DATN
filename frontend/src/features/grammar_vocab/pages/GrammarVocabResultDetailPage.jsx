import AnswerExplanation from '../../../components/common/AnswerExplanation';
import { getAdminGrammarPart } from '../utils/adminGrammarTestAdapter';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import { PART1_QUESTIONS as MOCK_QUESTIONS } from '../data/part1MockData';
import { PART2_WORD_SETS as MOCK_SETS } from '../data/part2MockData';
import { getAllGrammarVocabAnswers } from '../utils/grammarVocabSessionStorage';
import styles from './GrammarVocabResultDetailPage.module.css';
import RichTextContent from '../../../components/common/RichTextContent';

const PART1_ITEMS_PER_PAGE = 3;

function getStatus(answer, correctAnswer) {
  if (answer === undefined || answer === null) return 'skipped';
  return answer === correctAnswer ? 'correct' : 'wrong';
}

function StatusBadge({ status }) {
  const labels = { correct: 'Correct', wrong: 'Incorrect', skipped: 'Skipped' };
  return <span className={`${styles.statusBadge} ${styles[status]}`}>{labels[status]}</span>;
}

function Part1Review({ questions, answers }) {
  return (
    <div className={styles.part1List}>
      {questions.map((question) => {
        const userAnswer = answers[String(question.id)];
        const status = getStatus(userAnswer, question.correctAnswer);

        return (
          <article className={styles.questionCard} key={question.id}>
            <div className={styles.questionHeading}>
              <span className={styles.questionNumber}>{question.id}</span>
              <RichTextContent value={question.text}/>
              <StatusBadge status={status} />
            </div>
            <div className={styles.part1Options}>
              {question.options.map((option, index) => {
                const isUserAnswer = userAnswer === index;
                const isCorrectAnswer = question.correctAnswer === index;
                return (
                  <div
                    className={`${styles.optionRow} ${isCorrectAnswer ? styles.correctOption : ''} ${isUserAnswer && !isCorrectAnswer ? styles.wrongOption : ''}`}
                    key={index}
                    aria-label={`${option}${isCorrectAnswer ? ', correct' : isUserAnswer ? ', selected, incorrect' : ''}`}
                  >
                    <span className={styles.optionLetter}>{String.fromCharCode(65 + index)}</span>
                    <span>{option}</span>

                  </div>
                );
              })}
            </div>
            <AnswerExplanation text={question.explanation} />
          </article>
        );
      })}
    </div>
  );
}

function Part2Review({ wordSet, answers }) {
  return (
    <div className={styles.part2Layout}>
      <div className={styles.matchingList}>
        {wordSet.targetWords.map((target) => {
          const userAnswer = answers[String(target.id)];
          const status = getStatus(userAnswer, target.correctAnswer);
          const selectedOption = wordSet.options.find((option) => option.label === userAnswer);
          const correctOption = wordSet.options.find((option) => option.label === target.correctAnswer);

          return (
            <article className={styles.matchingItem} key={target.id}>
              <div className={styles.matchingRow}>
                <span className={styles.targetWord}>{target.word} =</span>
                <div className={`${styles.answerField} ${styles[`${status}Field`]}`}>
                  {selectedOption ? `${selectedOption.label}. ${selectedOption.text}` : 'No answer'}
                </div>
                <StatusBadge status={status} />

              </div>
              {status !== 'correct' && <div className={styles.correctField} aria-label="Correct answer">{correctOption?.label}. {correctOption?.text}</div>}
              <AnswerExplanation text={target.explanation} />
            </article>
          );
        })}
      </div>

      <aside className={styles.optionBank}>
        <h2>Options</h2>
        {wordSet.options.map((option) => (
          <div key={option.label}><strong>{option.label}</strong><span>{option.text}</span></div>
        ))}
      </aside>
    </div>
  );
}

export default function GrammarVocabResultDetailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  let history = null;
  try { history = JSON.parse(localStorage.getItem(`history_data_${searchParams.get('historyId')}`)); } catch { /* Legacy history may not have a snapshot. */ }
  const PART1_QUESTIONS = history?.testSnapshot?.part1 || getAdminGrammarPart(searchParams.get('testId'), 'part1') || MOCK_QUESTIONS;
  const PART2_WORD_SETS = history?.testSnapshot?.part2 || getAdminGrammarPart(searchParams.get('testId'), 'part2') || MOCK_SETS;
  const isFullTest = searchParams.get('isFull') === 'true';
  const requestedPart = searchParams.get('part') === '2' ? 'part2' : 'part1';
  const [activePart, setActivePart] = useState(isFullTest ? 'part1' : requestedPart);
  const [currentPage, setCurrentPage] = useState(1);
  const historyIdParam = searchParams.get('historyId');
  const answers = useMemo(() => {
    if (historyIdParam) {
      const stored = localStorage.getItem(`history_data_${historyIdParam}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.rawAnswers) return parsed.rawAnswers;
      }
    }
    return getAllGrammarVocabAnswers();
  }, [historyIdParam]);

  const isPart1 = activePart === 'part1';
  const totalPages = isPart1
    ? Math.ceil(PART1_QUESTIONS.length / PART1_ITEMS_PER_PAGE)
    : PART2_WORD_SETS.length;
  const startIndex = (currentPage - 1) * PART1_ITEMS_PER_PAGE;
  const visiblePart1Questions = PART1_QUESTIONS.slice(startIndex, startIndex + PART1_ITEMS_PER_PAGE);
  const visibleWordSet = PART2_WORD_SETS[currentPage - 1];
  const footerQuestions = isPart1
    ? PART1_QUESTIONS
    : PART2_WORD_SETS.flatMap((set) => set.targetWords.map(({ id }) => ({ id })));
  const currentQuestionIds = isPart1
    ? visiblePart1Questions.map(({ id }) => id)
    : visibleWordSet.targetWords.map(({ id }) => id);
  const answeredIds = Object.keys(isPart1 ? answers.part1 : answers.part2);

  const changePart = (part) => {
    setActivePart(part);
    setCurrentPage(1);
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage((page) => page - 1);
    } else if (isFullTest && activePart === 'part2') {
      setActivePart('part1');
      setCurrentPage(Math.ceil(PART1_QUESTIONS.length / PART1_ITEMS_PER_PAGE));
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage((page) => page + 1);
    } else if (isFullTest && activePart === 'part1') {
      setActivePart('part2');
      setCurrentPage(1);
    }
  };

  const handleQuestionClick = (questionId) => {
    if (isPart1) {
      setCurrentPage(Math.floor((questionId - 1) / PART1_ITEMS_PER_PAGE) + 1);
    } else {
      const setIndex = PART2_WORD_SETS.findIndex((set) => set.targetWords.some(({ id }) => id === questionId));
      setCurrentPage(setIndex + 1);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.content}>
        {isFullTest && (
          <div className={styles.partTabs}>
            <button className={isPart1 ? styles.activeTab : ''} onClick={() => changePart('part1')}>Part 1 · Grammar</button>
            <button className={!isPart1 ? styles.activeTab : ''} onClick={() => changePart('part2')}>Part 2 · Vocabulary</button>
          </div>
        )}

        <div className={styles.sectionHeader}>
          <strong>{isPart1 ? `Questions ${startIndex + 1}-${Math.min(startIndex + PART1_ITEMS_PER_PAGE, PART1_QUESTIONS.length)}` : `Questions ${visibleWordSet.questionRange || `${visibleWordSet.targetWords[0].id}–${visibleWordSet.targetWords.at(-1).id}`}`}</strong>
          <span>{isPart1 ? 'Choose the correct letter, A, B or C.' : visibleWordSet.instruction}</span>
        </div>

        {isPart1 ? (
          <Part1Review
            questions={visiblePart1Questions}
            answers={answers.part1}
          />
        ) : (
          <Part2Review
            wordSet={visibleWordSet}
            answers={answers.part2}
          />
        )}
      </main>

      <TestFooter
        partLabel={isPart1 ? 'Part 1' : 'Part 2'}
        questions={footerQuestions}
        answeredIds={answeredIds}
        currentPageQuestionIds={currentQuestionIds}
        onQuestionClick={handleQuestionClick}
        onPrevClick={handlePrevious}
        onNextClick={handleNext}
        onSubmitClick={() => navigate('/grammar-vocab/tests')}
        submitLabel="Take another test"
      />
    </div>
  );
}
