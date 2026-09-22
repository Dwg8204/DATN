import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import AudioPlayer from '../../../components/shared/AudioPlayer/AudioPlayer';
import InstructionBlock from '../../../components/common/InstructionBlock';
import MultipleChoice from '../../../components/common/MultipleChoice';
import RichTextContent from '../../../components/common/RichTextContent';
import { AttemptPageState, SaveIndicator } from '../../test-attempts/components/AttemptPageState';
import { useTestAttempt } from '../../test-attempts/context/testAttemptContextStore';
import styles from './Part4ListeningPage.module.css';

export default function Part4ListeningPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { attemptId, paper, answers, loading, loadError, saveStatus, submitting, setAnswer, submit, approveNavigation } = useTestAttempt();
  const [currentRecordingIdx, setCurrentRecordingIdx] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const part = paper?.parts?.['4'];
  const isFullTest = paper?.mode === 'full';
  
  const recordings = useMemo(() => part?.recordings ?? [], [part]);
  const allQuestions = useMemo(() => recordings.flatMap(r => r.subQuestions), [recordings]);

  if (loading || loadError) return <AttemptPageState loading={loading} error={loadError} />;
  if (!part) return <AttemptPageState error="Part 4 is not included in this test." />;

  const currentRecording = recordings[currentRecordingIdx];
  const allQuestionLabels = allQuestions.map((_, idx) => isFullTest ? 16 + idx : 1 + idx);
  const currentQuestionLabels = currentRecording.subQuestions.map(q => {
    const globalIdx = allQuestions.findIndex(sq => sq.key === q.key);
    return isFullTest ? 16 + globalIdx : 1 + globalIdx;
  });

  const confirmSubmit = async () => {
    setShowSubmitModal(false);
    const result = await submit();
    if (result) { approveNavigation(); navigate(`/listening/result?attemptId=${attemptId}`); }
  };

  const handleQuestionClick = (qKey) => {
    const recIdx = recordings.findIndex(rec => rec.subQuestions.some(sq => sq.key === qKey));
    if (recIdx !== -1) setCurrentRecordingIdx(recIdx);
  };

  const footerQuestions = allQuestions.map((q, idx) => ({ id: q.key, displayLabel: isFullTest ? 16 + idx : 1 + idx }));

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <div className={styles.headerBlock}>
          <div><div className={styles.partTitle}>Part 4</div><div className={styles.skillTitle}>Listening Test</div></div>
          <SaveIndicator status={saveStatus} />
        </div>
        <InstructionBlock title={`Questions ${allQuestionLabels.join(', ')}`}>
          Listen and choose the correct answer to the question.
        </InstructionBlock>
        <div className={styles.mainArea}>
          <div className={styles.questionSection}>
            <div className={styles.questionItem}>
              <div className={styles.multipleChoiceGroup} style={{ marginBottom: '40px' }}>
                <RichTextContent className={styles.questionContext} value={currentRecording.context}/>
                {currentRecording.subQuestions.map((q, localIdx) => {
                  const answer = answers[q.key];
                  const selectedIndex = q.options.findIndex(opt => opt.id === answer?.optionId);
                  return (
                    <div key={q.key} style={{ marginBottom: '24px' }}>
                      <div className={styles.questionHeader}>
                        <div className={styles.questionNumberBox}>
                          <span className={styles.questionNumber}>{currentQuestionLabels[localIdx]}</span>
                        </div>
                        <div className={styles.questionSubText}>{q.text}</div>
                      </div>
                      <MultipleChoice
                        name={`listening-question-${q.key}`}
                        options={q.options.map(opt => opt.text)}
                        value={selectedIndex < 0 ? undefined : selectedIndex}
                        onChange={(optionIndex) => setAnswer(q.key, { kind: 'CHOICE', optionId: q.options[optionIndex].id })}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className={styles.audioSection}>
            <AudioPlayer key={currentRecording.id} src={currentRecording.audioUrl} maxPlays={2} allowSkip={!isFullTest} />
          </div>
        </div>
      </div>
      <TestFooter 
        partLabel="Part 4" 
        questions={footerQuestions}
        answeredIds={Object.keys(answers).filter(key => key.startsWith('p4:'))}
        currentPageQuestionIds={currentRecording.subQuestions.map(q => q.key)}
        onQuestionClick={handleQuestionClick}
        onPrevClick={() => currentRecordingIdx > 0 ? setCurrentRecordingIdx(prev => prev - 1) : navigate(`/listening/test/part3?attemptId=${attemptId}`)}
        onNextClick={() => setCurrentRecordingIdx(prev => prev + 1)}
        onSubmitClick={() => setShowSubmitModal(true)}
        submitLabel={submitting ? 'Submitting…' : 'Submit'}
        submitDisabled={submitting || saveStatus === 'conflict'}
        hasPrev={currentRecordingIdx > 0 || isFullTest}
        hasNext={currentRecordingIdx < recordings.length - 1}
      />
      <SubmitModal isOpen={showSubmitModal} onBack={() => setShowSubmitModal(false)} onNext={confirmSubmit} busy={submitting} />
    </div>
  );
}
