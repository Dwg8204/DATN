import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import { savePartAnswers } from '../utils/listeningSessionStorage';
import { PART2_DATA } from '../data/part2MockData';
import AudioPlayer from '../../../components/shared/AudioPlayer/AudioPlayer';
import AnswerSelect from '../../../components/common/AnswerSelect';
import InstructionBlock from '../../../components/common/InstructionBlock';
import styles from './Part2ListeningPage.module.css';

export default function Part2ListeningPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('testId') || '1';
  const isFullTest = searchParams.get('isFull') === 'true';

  const [answers, setAnswers] = useState(() => {
    const allAnswers = JSON.parse(sessionStorage.getItem('listening_p2_answers') || '{}');
    return allAnswers;
  });
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const handleOptionSelect = (speakerIndex, option) => {
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [speakerIndex]: option
      };
      savePartAnswers('part2', newAnswers);
      return newAnswers;
    });
  };

  const handleSubmit = () => {
    setShowSubmitModal(true);
  };

  const handleConfirmSubmit = () => {
    savePartAnswers('part2', answers);
    setShowSubmitModal(false);
    if (isFullTest) {
      navigate(`/listening/test/part3?testId=${testId}&isFull=true`);
    } else {
      navigate(`/listening/result?testId=${testId}&isFull=false&part=2`);
    }
  };

  const handleCloseSubmit = () => {
    setShowSubmitModal(false);
  };

  const submitLabel = isFullTest ? 'Next Part' : 'Submit';

  // Treat Part 2 as a single question (ID 14) in the footer, despite having multiple speakers.
  const questionIds = [PART2_DATA.id];
  // Mark the question as answered only when all speakers have answers.
  const isAnswered = PART2_DATA.speakers.every((_, idx) => answers[idx]);

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <div className={styles.headerBlock}>
          <div className={styles.partTitle}>Part 2</div>
          <div className={styles.skillTitle}>Listening Test</div>
        </div>

        <InstructionBlock title={`Question ${PART2_DATA.id}`}>
          {PART2_DATA.instruction}
        </InstructionBlock>

        <div className={styles.mainArea}>
          <div className={styles.questionSection}>
            <div className={styles.questionItem}>
              <div className={styles.matchingList}>
                {PART2_DATA.speakers.map((speaker, idx) => {
                  const selectedOption = answers[idx];

                  return (
                    <div key={idx} className={styles.matchItem}>
                      <span className={styles.speakerText}>{speaker} ...</span>

                      <div className={styles.dropdownContainer}>
                        <AnswerSelect
                          value={selectedOption || ''}
                          onChange={(event) => handleOptionSelect(idx, event.target.value)}
                          placeholder="Select statement"
                          ariaLabel={`Answer for ${speaker}`}
                          options={PART2_DATA.options.map((opt, i) => ({ value: opt, label: `${String.fromCharCode(65 + i)}. ${opt}` }))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={styles.audioSection}>
            <AudioPlayer src={PART2_DATA.audioUrl} maxPlays={2} />
          </div>
        </div>
      </div>

      <TestFooter
        partLabel="Part 2"
        questions={[{ id: 14 }]}
        answeredIds={isAnswered ? ['14'] : []}
        currentPageQuestionIds={[14]}
        onQuestionClick={() => { }}
        onPrevClick={() => navigate(`/listening/test/part1?testId=${testId}&isFull=${isFullTest}`)}
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
