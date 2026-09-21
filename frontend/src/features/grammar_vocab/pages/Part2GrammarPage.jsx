import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import AnswerSelect from '../../../components/common/AnswerSelect';
import InstructionBlock from '../../../components/common/InstructionBlock';
import RichTextContent from '../../../components/common/RichTextContent';
import { AttemptPageState, SaveIndicator } from '../../test-attempts/components/AttemptPageState';
import { useTestAttempt } from '../../test-attempts/context/testAttemptContextStore';
import styles from './Part2GrammarPage.module.css';

const SETS_PER_PAGE = 2;

export default function Part2GrammarPage() {
  const navigate = useNavigate();
  const { attemptId, paper, answers, loading, loadError, saveStatus, submitting, setAnswer, submit, approveNavigation } = useTestAttempt();
  const [currentPage, setCurrentPage] = useState(1);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const sets = useMemo(() => paper?.parts?.['2']?.sets ?? [], [paper]);
  const totalPages = Math.max(1, Math.ceil(sets.length / SETS_PER_PAGE));
  const startIndex = (currentPage - 1) * SETS_PER_PAGE;
  const currentSets = sets.slice(startIndex, startIndex + SETS_PER_PAGE);
  const allQuestions = useMemo(() => sets.flatMap(set => set.targetWords).map((target, index) => ({
    id: target.key, displayLabel: index + 26,
  })), [sets]);

  if (loading || loadError) return <AttemptPageState loading={loading} error={loadError} />;
  if (!paper?.parts?.['2']) return <AttemptPageState error="Part 2 is not included in this test." />;

  const confirmSubmit = async () => {
    setShowSubmitModal(false);
    const result = await submit();
    if (result) { approveNavigation(); navigate(`/grammar-vocab/result?attemptId=${attemptId}`); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <div className={styles.headerBlock}>
          <div><div className={styles.partTitle}>Part 2</div><div className={styles.skillTitle}>Grammar &amp; Vocabulary</div></div>
          <SaveIndicator status={saveStatus} />
        </div>
        {currentSets.map(set => {
          const first = allQuestions.findIndex(question => question.id === set.targetWords[0]?.key) + 26;
          const last = first + set.targetWords.length - 1;
          return (
            <div key={set.setId} className={styles.wordSetBlock}>
              <InstructionBlock title={`Questions ${first}-${last}`}>
                <RichTextContent value={set.instruction} />
              </InstructionBlock>
              <div className={styles.matchingArea}>
                <div className={styles.targetWordsColumn}>
                  {set.targetWords.map(target => (
                    <div key={target.key} className={styles.matchingRow}>
                      <div className={styles.targetWordText}>{target.word} = </div>
                      <div className={styles.dropdownContainer}>
                        <AnswerSelect
                          value={answers[target.key]?.optionId ?? ''}
                          onChange={event => setAnswer(target.key, { kind: 'MATCH', optionId: event.target.value })}
                          placeholder={`Question ${allQuestions.findIndex(question => question.id === target.key) + 26}`}
                          ariaLabel={`Answer for ${target.word}`}
                          options={set.options.map(option => ({ value: option.id, label: `${option.id}. ${option.text}` }))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <TestFooter
        partLabel="Part 2"
        questions={allQuestions}
        answeredIds={Object.keys(answers)}
        currentPageQuestionIds={currentSets.flatMap(set => set.targetWords.map(target => target.key))}
        onQuestionClick={key => setCurrentPage(Math.floor(sets.findIndex(set => set.targetWords.some(target => target.key === key)) / SETS_PER_PAGE) + 1)}
        onPrevClick={() => setCurrentPage(page => Math.max(1, page - 1))}
        onNextClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
        onSubmitClick={() => setShowSubmitModal(true)}
        submitLabel={submitting ? 'Submitting…' : 'Submit'}
        submitDisabled={submitting || saveStatus === 'conflict'}
        hasPrev={currentPage > 1}
        hasNext={currentPage < totalPages}
      />
      <SubmitModal isOpen={showSubmitModal} onBack={() => setShowSubmitModal(false)} onNext={confirmSubmit} busy={submitting} />
    </div>
  );
}
