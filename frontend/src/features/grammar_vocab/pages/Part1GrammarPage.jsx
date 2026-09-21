import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import InstructionBlock from '../../../components/common/InstructionBlock';
import MultipleChoice from '../../../components/common/MultipleChoice';
import RichTextContent from '../../../components/common/RichTextContent';
import { AttemptPageState, SaveIndicator } from '../../test-attempts/components/AttemptPageState';
import { useTestAttempt } from '../../test-attempts/context/testAttemptContextStore';
import styles from './Part1GrammarPage.module.css';

const ITEMS_PER_PAGE = 3;

export default function Part1GrammarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { attemptId, paper, answers, loading, loadError, saveStatus, submitting, setAnswer, flush, submit, approveNavigation } = useTestAttempt();
  const [currentPage, setCurrentPage] = useState(1);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const questions = useMemo(() => paper?.parts?.['1']?.questions ?? [], [paper]);
  const isFullTest = paper?.mode === 'full';
  const totalPages = Math.max(1, Math.ceil(questions.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentQuestions = questions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const footerQuestions = useMemo(() => questions.map((question, index) => ({
    id: question.key, displayLabel: index + 1,
  })), [questions]);

  if (loading || loadError) return <AttemptPageState loading={loading} error={loadError} />;
  if (!paper?.parts?.['1']) return <AttemptPageState error="Part 1 is not included in this test." />;

  const goToPartTwo = async () => {
    await flush();
    const params = new URLSearchParams(searchParams);
    params.set('attemptId', attemptId);
    params.set('isFull', 'true');
    navigate(`/grammar-vocab/test/part2?${params.toString()}`);
  };

  const confirmSubmit = async () => {
    setShowSubmitModal(false);
    const result = await submit();
    if (result) { approveNavigation(); navigate(`/grammar-vocab/result?attemptId=${attemptId}`); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <div className={styles.headerBlock}>
          <div><div className={styles.partTitle}>Part 1</div><div className={styles.skillTitle}>Grammar &amp; Vocabulary</div></div>
          <SaveIndicator status={saveStatus} />
        </div>
        <InstructionBlock title={`Questions ${startIndex + 1}-${Math.min(startIndex + ITEMS_PER_PAGE, questions.length)}`}>
          <RichTextContent value={paper.parts['1'].instruction || 'Choose the correct letter, A, B or C.'} />
        </InstructionBlock>
        <div className={styles.questionsContainer}>
          {currentQuestions.map((question, localIndex) => {
            const answer = answers[question.key];
            const selectedIndex = question.options.findIndex(option => option.id === answer?.optionId);
            return (
              <div key={question.key} className={styles.questionItem}>
                <div className={styles.questionHeader}>
                  <div className={styles.questionNumberBox}><span className={styles.questionNumber}>{startIndex + localIndex + 1}</span></div>
                  <RichTextContent className={styles.questionText} value={question.text} />
                </div>
                <MultipleChoice
                  name={`grammar-question-${question.key}`}
                  options={question.options.map(option => option.text)}
                  value={selectedIndex < 0 ? undefined : selectedIndex}
                  onChange={index => setAnswer(question.key, { kind: 'CHOICE', optionId: question.options[index].id })}
                />
              </div>
            );
          })}
        </div>
      </div>
      <TestFooter
        partLabel="Part 1"
        questions={footerQuestions}
        answeredIds={Object.keys(answers)}
        currentPageQuestionIds={currentQuestions.map(question => question.key)}
        onQuestionClick={key => setCurrentPage(Math.floor(questions.findIndex(question => question.key === key) / ITEMS_PER_PAGE) + 1)}
        onPrevClick={() => setCurrentPage(page => Math.max(1, page - 1))}
        onNextClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
        onSubmitClick={isFullTest ? goToPartTwo : () => setShowSubmitModal(true)}
        submitLabel={isFullTest ? 'Next Part' : submitting ? 'Submitting…' : 'Submit'}
        submitDisabled={submitting || saveStatus === 'conflict'}
        hasPrev={currentPage > 1}
        hasNext={currentPage < totalPages}
      />
      <SubmitModal isOpen={showSubmitModal} onBack={() => setShowSubmitModal(false)} onNext={confirmSubmit} busy={submitting} />
    </div>
  );
}
