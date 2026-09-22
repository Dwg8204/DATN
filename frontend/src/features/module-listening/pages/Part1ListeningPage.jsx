import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import InstructionBlock from '../../../components/common/InstructionBlock';
import MultipleChoice from '../../../components/common/MultipleChoice';
import AudioPlayer from '../../../components/shared/AudioPlayer/AudioPlayer';
import { AttemptPageState, SaveIndicator } from '../../test-attempts/components/AttemptPageState';
import { useTestAttempt } from '../../test-attempts/context/testAttemptContextStore';
import styles from './Part1ListeningPage.module.css';

const ITEMS_PER_PAGE = 1;

export default function Part1ListeningPage() {
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
    navigate(`/listening/test/part2?${params.toString()}`);
  };

  const confirmSubmit = async () => {
    setShowSubmitModal(false);
    const result = await submit();
    if (result) { approveNavigation(); navigate(`/listening/result?attemptId=${attemptId}`); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <div className={styles.headerBlock}>
          <div><div className={styles.partTitle}>Part 1</div><div className={styles.skillTitle}>Listening Test</div></div>
          <SaveIndicator status={saveStatus} />
        </div>
        <InstructionBlock title={`Question ${startIndex + 1} of ${questions.length}`}>
          Listen to the recording and choose the correct answer (A, B or C) for each question.
        </InstructionBlock>
        <div className={styles.mainArea}>
          <div className={styles.questionSection}>
            {currentQuestions.map((question, localIndex) => {
              const answer = answers[question.key];
              const selectedIndex = question.options.findIndex(option => option.id === answer?.optionId);
              return (
                <div key={question.key} className={styles.questionItem}>
                  <div className={styles.questionHeader}>
                    <div className={styles.questionNumberBox}>
                      <span className={styles.questionNumber}>{startIndex + localIndex + 1}</span>
                    </div>
                    <div className={styles.questionText}>{question.text}</div>
                  </div>
                  <MultipleChoice
                    name={`listening-question-${question.key}`}
                    options={question.options.map(option => option.text)}
                    value={selectedIndex < 0 ? undefined : selectedIndex}
                    onChange={index => setAnswer(question.key, { kind: 'CHOICE', optionId: question.options[index].id })}
                  />
                </div>
              );
            })}
          </div>
          <div className={styles.audioSection}>
            <AudioPlayer key={currentQuestions[0]?.key} src={currentQuestions[0]?.audioUrl} maxPlays={2} allowSkip={!isFullTest} />
          </div>
        </div>
      </div>
      <TestFooter
        partLabel="Part 1"
        questions={footerQuestions}
        answeredIds={Object.keys(answers).filter(key => key.startsWith('p1:'))}
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
