import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import InstructionBlock from '../../../components/common/InstructionBlock';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import { countWords } from '../utils/wordCount';
import { WRITING_TASKS } from '../data/writingTasks';
import { getAdminWritingTask } from '../utils/adminWritingTestAdapter';
import { finishWritingSession, getWritingAnswers, saveWritingAnswers, startWritingSession } from '../utils/writingSessionStorage';
import styles from './WritingPartPage.module.css';

const partOrder = ['part1', 'part2', 'part3', 'part4'];

export default function WritingPartPage() {
  const { part = 'part1' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const testId = searchParams.get('testId') || '1';
  const task = getAdminWritingTask(testId, part) || WRITING_TASKS[part] || WRITING_TASKS.part1;
  const isFull = searchParams.get('isFull') === 'true';
  const partIndex = partOrder.indexOf(part);
  const [answers, setAnswers] = useState(() => {
    startWritingSession(testId, isFull ? 'full' : part, { force: searchParams.get('fresh') === 'true' });
    return getWritingAnswers(part);
  });
  const [showSubmit, setShowSubmit] = useState(false);
  const questions = useMemo(() => task.questions.map((_, index) => ({ id: index + 1 })), [task]);

  useEffect(() => saveWritingAnswers(part, answers), [answers, part]);

  const confirmSubmit = () => {
    setShowSubmit(false);
    if (isFull && partIndex < partOrder.length - 1) {
      navigate(`/writing/test/${partOrder[partIndex + 1]}?testId=${testId}&isFull=true`);
    } else {
      finishWritingSession();
      navigate(`/writing/result?testId=${testId}&isFull=${isFull}&part=${part}`);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.heading}><strong>{task.title}</strong><span>Writing</span></div>
        <InstructionBlock title={task.title}>{task.instruction}</InstructionBlock>
        <div className={styles.taskList}>
          {task.questions.map((question, index) => {
            const guide = task.wordGuides?.[index] || task.wordGuide;
            const value = answers[index] || '';
            return (
              <article className={styles.taskCard} key={question}>
                <label htmlFor={`writing-${part}-${index}`}><span className={styles.number}>{index + 1}</span><span>{question}</span></label>
                {task.type === 'short' ? (
                  <input id={`writing-${part}-${index}`} value={value} onChange={(event) => setAnswers((current) => ({ ...current, [index]: event.target.value }))} placeholder="Type your answer" />
                ) : (
                  <textarea id={`writing-${part}-${index}`} rows={task.type === 'email' && index === 1 ? 10 : 6} value={value} onChange={(event) => setAnswers((current) => ({ ...current, [index]: event.target.value }))} placeholder="Write your response here..." />
                )}
                <div className={styles.wordCount}><span>{guide}</span><strong>{countWords(value)} words</strong></div>
              </article>
            );
          })}
        </div>
      </div>
      <TestFooter partLabel={`Part ${partIndex + 1}`} questions={questions} answeredIds={Object.keys(answers).filter((key) => answers[key]?.trim()).map((key) => String(Number(key) + 1))} currentPageQuestionIds={questions.map(({ id }) => id)} hasPrev={false} hasNext={false} onSubmitClick={() => setShowSubmit(true)} submitLabel={isFull && partIndex < 3 ? 'Next Part' : 'Submit'} />
      <SubmitModal isOpen={showSubmit} onBack={() => setShowSubmit(false)} onNext={confirmSubmit} />
    </div>
  );
}
