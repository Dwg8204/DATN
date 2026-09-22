import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import AudioPlayer from '../../../components/shared/AudioPlayer/AudioPlayer';
import AnswerSelect from '../../../components/common/AnswerSelect';
import InstructionBlock from '../../../components/common/InstructionBlock';
import { AttemptPageState, SaveIndicator } from '../../test-attempts/components/AttemptPageState';
import { useTestAttempt } from '../../test-attempts/context/testAttemptContextStore';
import styles from './Part2ListeningPage.module.css';

export default function Part2ListeningPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { attemptId, paper, answers, loading, loadError, saveStatus, submitting, setAnswer, flush, submit, approveNavigation } = useTestAttempt();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const part = paper?.parts?.['2'];
  const isFullTest = paper?.mode === 'full';

  if (loading || loadError) return <AttemptPageState loading={loading} error={loadError} />;
  if (!part) return <AttemptPageState error="Part 2 is not included in this test." />;

  const goToPartThree = async () => {
    await flush();
    const params = new URLSearchParams(searchParams);
    params.set('attemptId', attemptId);
    navigate(`/listening/test/part3?${params.toString()}`);
  };

  const confirmSubmit = async () => {
    setShowSubmitModal(false);
    const result = await submit();
    if (result) { approveNavigation(); navigate(`/listening/result?attemptId=${attemptId}`); }
  };

  const questionIds = ['p2'];
  const isAnswered = part.speakers.every(speaker => answers[speaker.key]);

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <div className={styles.headerBlock}>
          <div><div className={styles.partTitle}>Part 2</div><div className={styles.skillTitle}>Listening Test</div></div>
          <SaveIndicator status={saveStatus} />
        </div>
        <InstructionBlock title={`Question 14`}>
          {part.instruction}
        </InstructionBlock>
        <div className={styles.mainArea}>
          <div className={styles.questionSection}>
            <div className={styles.questionItem}>
              <div className={styles.matchingList}>
                {part.speakers.map(speaker => {
                  const answer = answers[speaker.key];
                  const selectedOption = answer ? part.options.find(opt => opt.id === answer.optionId) : null;
                  return (
                    <div key={speaker.key} className={styles.matchItem}>
                      <span className={styles.speakerText}>{speaker.name} ...</span>
                      <div className={styles.dropdownContainer}>
                        <AnswerSelect
                          value={selectedOption?.text || ''}
                          onChange={(event) => {
                            const opt = part.options.find(o => o.text === event.target.value);
                            if (opt) setAnswer(speaker.key, { kind: 'MATCH', optionId: opt.id });
                          }}
                          placeholder="Select statement"
                          ariaLabel={`Answer for ${speaker.name}`}
                          options={part.options.map((opt) => ({ value: opt.text, label: `${opt.id}. ${opt.text}` }))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className={styles.audioSection}>
            <AudioPlayer src={part.audioUrl} maxPlays={2} allowSkip={!isFullTest} />
          </div>
        </div>
      </div>
      <TestFooter
        partLabel="Part 2"
        questions={[{ id: 'p2', displayLabel: 14 }]}
        answeredIds={isAnswered ? ['p2'] : []}
        currentPageQuestionIds={['p2']}
        onQuestionClick={() => {}}
        onPrevClick={() => navigate(`/listening/test/part1?attemptId=${attemptId}`)}
        onNextClick={() => {}}
        onSubmitClick={isFullTest ? goToPartThree : () => setShowSubmitModal(true)}
        submitLabel={isFullTest ? 'Next Part' : submitting ? 'Submitting…' : 'Submit'}
        submitDisabled={submitting || saveStatus === 'conflict'}
        hasPrev={isFullTest}
        hasNext={false}
      />
      <SubmitModal isOpen={showSubmitModal} onBack={() => setShowSubmitModal(false)} onNext={confirmSubmit} busy={submitting} />
    </div>
  );
}
