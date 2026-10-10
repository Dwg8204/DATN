import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import AudioPlayer from '../../../components/shared/AudioPlayer/AudioPlayer';
import AnswerSelect from '../../../components/common/AnswerSelect';
import InstructionBlock from '../../../components/common/InstructionBlock';
import RichTextContent from '../../../components/common/RichTextContent';
import { AttemptPageState, SaveIndicator } from '../../test-attempts/components/AttemptPageState';
import { useTestAttempt } from '../../test-attempts/context/testAttemptContextStore';
import PracticeAnswerReveal from '../../practice/components/PracticeAnswerReveal';
import styles from './Part3ListeningPage.module.css';

export default function Part3ListeningPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { attemptId, attempt, paper, answers, loading, loadError, saveStatus, submitting, timeExpired, isPractice, setAnswer, flush, submit, approveNavigation } = useTestAttempt();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const part = paper?.parts?.['3'];
  const isFullTest = paper?.mode === 'full';

  if (loading || loadError) return <AttemptPageState loading={loading} error={loadError} />;
  if (!part) return <AttemptPageState error="Part 3 is not included in this test." />;

  const goToPartFour = async () => {
    await flush();
    const params = new URLSearchParams(searchParams);
    params.set('attemptId', attemptId);
    navigate(`/listening/test/part4?${params.toString()}`);
  };

  const confirmSubmit = async () => {
    setShowSubmitModal(false);
    try {
      const result = await submit();
      if (result) { approveNavigation(); navigate(`/listening/result?attemptId=${attemptId}${isPractice ? '&practice=true' : ''}`); }
    } catch { /* The provider displays the error. */ }
  };

  const isAnswered = part.statements.every(stmt => answers[stmt.key]);

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <div className={styles.headerBlock}>
          <div><div className={styles.partTitle}>Part 3</div><div className={styles.skillTitle}>Listening Test</div></div>
          <SaveIndicator status={saveStatus} />
        </div>
        <InstructionBlock title={`Question 15`}>
          {part.context}
        </InstructionBlock>
        <div className={styles.mainArea}>
          <div className={styles.questionSection}>
            <div className={styles.questionItem}>
              <div className={styles.questionText}>{part.subTitle}</div>
              <div className={styles.matchingList}>
                {part.statements.map(stmt => {
                  const answer = answers[stmt.key];
                  const selectedOption = answer ? part.options.find(opt => opt.id === answer.optionId) : null;
                  return (
                    <div key={stmt.key} className={styles.matchItem}>
                      <RichTextContent className={styles.statementText} value={stmt.text}/>
                      <div className={styles.dropdownContainer}>
                        <AnswerSelect
                          value={selectedOption?.text || ''}
                          disabled={submitting || timeExpired || !attempt?.canAnswer || saveStatus === 'conflict'}
                          onChange={(event) => {
                            const opt = part.options.find(o => o.text === event.target.value);
                            if (opt) setAnswer(stmt.key, { kind: 'MATCH', optionId: opt.id });
                          }}
                          placeholder="Select opinion"
                          ariaLabel={`Answer for statement`}
                          options={part.options.map((opt, i) => ({ value: opt.text, label: `${String.fromCharCode(65 + i)}. ${opt.text}` }))}
                        />
                        <PracticeAnswerReveal questionKey={stmt.key} options={part.options} />
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
        partLabel="Part 3"
        questions={[{ id: 'p3', displayLabel: 15 }]}
        answeredIds={isAnswered ? ['p3'] : []}
        currentPageQuestionIds={['p3']}
        onQuestionClick={() => {}}
        onPrevClick={() => { const params = new URLSearchParams(searchParams); params.set('attemptId', attemptId); navigate(`/listening/test/part2?${params}`); }}
        onNextClick={() => {}}
        onSubmitClick={isFullTest ? () => void goToPartFour().catch(() => undefined) : () => setShowSubmitModal(true)}
        submitLabel={isFullTest ? 'Next Part' : submitting ? 'Submitting…' : 'Submit'}
        submitDisabled={submitting || timeExpired || saveStatus === 'conflict' || saveStatus === 'error'}
        hasPrev={isFullTest}
        hasNext={false}
      />
      <SubmitModal isOpen={showSubmitModal} onBack={() => setShowSubmitModal(false)} onNext={confirmSubmit} busy={submitting} />
    </div>
  );
}
