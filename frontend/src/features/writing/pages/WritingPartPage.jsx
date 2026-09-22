import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import InstructionBlock from '../../../components/common/InstructionBlock';
import RichTextContent from '../../../components/common/RichTextContent';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import { AttemptPageState, SaveIndicator } from '../../test-attempts/components/AttemptPageState';
import { useTestAttempt } from '../../test-attempts/context/testAttemptContextStore';
import { countWords } from '../utils/wordCount';
import { partsInWritingPaper, writingPartNumber, writingTaskFromPaper, writingWordGuide } from '../utils/writingAttemptPaper';
import styles from './WritingPartPage.module.css';

export default function WritingPartPage() {
  const { part = 'part1' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { attemptId, paper, answers, loading, loadError, saveStatus, submitting,
    setAnswer, flush, submit, approveNavigation } = useTestAttempt();
  const [showSubmit, setShowSubmit] = useState(false);
  const partNumber = writingPartNumber(part);
  const task = useMemo(() => writingTaskFromPaper(paper, part), [paper, part]);
  const availableParts = useMemo(() => partsInWritingPaper(paper), [paper]);
  const partIndex = availableParts.indexOf(part);
  const isFull = paper?.mode === 'full';
  const footerQuestions = useMemo(() => (task?.questions ?? []).map((question, index) => ({ id: question.key, displayLabel: index + 1 })), [task]);

  if (loading || loadError) return <AttemptPageState loading={loading} error={loadError} backHref="/writing/tests" />;
  if (!task) return <AttemptPageState error={`Part ${partNumber} is not included in this test.`} backHref="/writing/tests" />;

  const navigateToPart = async nextPart => {
    await flush();
    const params = new URLSearchParams(searchParams);
    params.set('attemptId', attemptId);
    navigate(`/writing/test/${nextPart}?${params.toString()}`);
  };

  const handlePrimaryAction = () => {
    if (isFull && partIndex < availableParts.length - 1) {
      void navigateToPart(availableParts[partIndex + 1]);
      return;
    }
    setShowSubmit(true);
  };

  const confirmSubmit = async () => {
    setShowSubmit(false);
    const result = await submit();
    if (result) {
      approveNavigation();
      navigate(`/writing/result?attemptId=${attemptId}`);
    }
  };

  const scrollToQuestion = key => document.getElementById(`writing-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return <div className={styles.page}>
    <div className={styles.content}>
      <div className={styles.heading}>
        <div><strong>{task.title}</strong><span>{paper.title}</span></div>
        <SaveIndicator status={saveStatus} />
      </div>
      <InstructionBlock title={`Part ${partNumber}`}><RichTextContent value={task.instruction} /></InstructionBlock>
      <div className={styles.taskList}>
        {task.questions.map((question, index) => {
          const answer = answers[question.key];
          const value = answer?.kind === 'TEXT' ? answer.text : '';
          const inputProps = {
            id: `writing-${question.key}`,
            value,
            disabled: submitting,
            onBlur: () => void flush().catch(() => undefined),
            onChange: event => setAnswer(question.key, event.target.value === '' ? null : { kind: 'TEXT', text: event.target.value }),
            placeholder: task.type === 'short' ? 'Type your answer' : 'Write your response here...',
          };
          return <article className={styles.taskCard} key={question.key}>
            <label htmlFor={inputProps.id}><span className={styles.number}>{index + 1}</span><RichTextContent value={question.text} /></label>
            {task.type === 'short' ? <input {...inputProps} /> : <textarea {...inputProps} rows={task.type === 'email' && index === 1 ? 10 : 6} />}
            <div className={styles.wordCount}><span>{writingWordGuide(part, index)}</span><strong>{countWords(value)} words</strong></div>
          </article>;
        })}
      </div>
    </div>
    <TestFooter
      partLabel={`Part ${partNumber}`}
      questions={footerQuestions}
      answeredIds={Object.entries(answers).filter(([, answer]) => answer?.kind === 'TEXT' && answer.text.trim()).map(([key]) => key)}
      currentPageQuestionIds={footerQuestions.map(question => question.id)}
      onQuestionClick={scrollToQuestion}
      onPrevClick={isFull && partIndex > 0 ? () => void navigateToPart(availableParts[partIndex - 1]) : undefined}
      onSubmitClick={handlePrimaryAction}
      submitLabel={isFull && partIndex < availableParts.length - 1 ? 'Next Part' : submitting ? 'Submitting…' : 'Submit'}
      submitDisabled={submitting || saveStatus === 'conflict'}
      hasPrev={isFull && partIndex > 0}
      hasNext={false}
    />
    <SubmitModal isOpen={showSubmit} onBack={() => setShowSubmit(false)} onNext={confirmSubmit} busy={submitting} />
  </div>;
}
