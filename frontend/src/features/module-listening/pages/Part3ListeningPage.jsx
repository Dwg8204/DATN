import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import { savePartAnswers } from '../utils/listeningSessionStorage';
import { getListeningTestParts } from '../services/listeningTestRepository';
import AudioPlayer from '../../../components/shared/AudioPlayer/AudioPlayer';
import AnswerSelect from '../../../components/common/AnswerSelect';
import InstructionBlock from '../../../components/common/InstructionBlock';
import styles from './Part3ListeningPage.module.css';

export default function Part3ListeningPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('testId') || '1';
  const isFullTest = searchParams.get('isFull') === 'true';
  const { part3: partData } = getListeningTestParts(testId);

  const [answers, setAnswers] = useState(() => {
    const allAnswers = JSON.parse(sessionStorage.getItem('listening_p3_answers') || '{}');
    return allAnswers;
  });
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const handleOptionSelect = (statementId, option) => {
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [statementId]: option
      };
      savePartAnswers('part3', newAnswers);
      return newAnswers;
    });
  };

  const handleSubmit = () => {
    setShowSubmitModal(true);
  };

  const handleConfirmSubmit = () => {
    savePartAnswers('part3', answers);
    setShowSubmitModal(false);
    if (isFullTest) {
      navigate(`/listening/test/part4?testId=${testId}&isFull=true`);
    } else {
      navigate(`/listening/result?testId=${testId}&isFull=false&part=3`);
    }
  };

  const handleCloseSubmit = () => {
    setShowSubmitModal(false);
  };

  const submitLabel = isFullTest ? 'Next Part' : 'Submit';

  // Treat Part 3 as a single question (ID 15) in the footer.
  const isAnswered = partData.statements.every((stmt) => answers[stmt.id]);

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <div className={styles.headerBlock}>
          <div className={styles.partTitle}>Part 3</div>
          <div className={styles.skillTitle}>Listening Test</div>
        </div>

        <InstructionBlock title={`Question ${partData.id}`}>
          {partData.context}
        </InstructionBlock>

        <div className={styles.mainArea}>
          <div className={styles.questionSection}>
            <div className={styles.questionItem}>
              <div className={styles.questionText}>{partData.subTitle}</div>

              <div className={styles.matchingList}>
                {partData.statements.map((stmt) => {
                  const selectedOption = answers[stmt.id];

                  return (
                    <div key={stmt.id} className={styles.matchItem}>
                      <span className={styles.statementText}>{stmt.text}</span>

                      <div className={styles.dropdownContainer}>
                        <AnswerSelect
                          value={selectedOption || ''}
                          onChange={(event) => handleOptionSelect(stmt.id, event.target.value)}
                          placeholder="Select opinion"
                          ariaLabel={`Answer for statement ${stmt.id}`}
                          options={partData.options.map((opt, i) => ({ value: opt, label: `${String.fromCharCode(65 + i)}. ${opt}` }))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={styles.audioSection}>
            <AudioPlayer src={partData.audioUrl} maxPlays={2} allowSkip={!isFullTest} />
          </div>
        </div>
      </div>

      <TestFooter
        partLabel="Part 3"
        questions={[{ id: 15 }]}
        answeredIds={isAnswered ? ['15'] : []}
        currentPageQuestionIds={[15]}
        onQuestionClick={() => { }}
        onPrevClick={() => navigate(`/listening/test/part2?testId=${testId}&isFull=${isFullTest}`)}
        onNextClick={() => { }}
        onSubmitClick={handleSubmit}
        submitLabel={submitLabel}
        hasPrev={isFullTest}
        hasNext={false}
      />

      <SubmitModal
        isOpen={showSubmitModal}
        onBack={handleCloseSubmit}
        onNext={handleConfirmSubmit}
      />
    </div>
  );
}
