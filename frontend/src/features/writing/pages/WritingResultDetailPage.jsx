import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import WritingScoreRing from '../components/WritingScoreRing';
import { WRITING_TASKS } from '../data/writingTasks';
import { getAiImprovedAnswer, getWritingAssessment, WRITING_PART_ORDER, WRITING_SAMPLE_ANSWERS } from '../data/writingResultData';
import { getWritingSession } from '../utils/writingSessionStorage';
import { getAdminWritingTask } from '../utils/adminWritingTestAdapter';
import { countWords } from '../utils/wordCount';
import styles from './WritingResultDetailPage.module.css';
import './WritingResultDetailEnhancements.css';

const views = [{ key: 'student', label: 'Your Answer' }, { key: 'ai', label: 'AI Answer' }, { key: 'sample', label: 'Sample Answer' }];

function ResponseCard({ part, index, answer, view, task }) {
  const sampleAnswer = task.sampleAnswers?.[index] || WRITING_SAMPLE_ANSWERS[part][index];
  const displayed = view === 'student' ? answer : view === 'ai' ? (answer ? getAiImprovedAnswer(part, index, answer) : sampleAnswer) : sampleAnswer;
  return <article className={styles.response}><header><span>{index + 1}</span><h3>{task.questions[index]}</h3></header><div className={`${styles.answer} ${!displayed ? styles.empty : ''}`}>{displayed || 'No answer was submitted.'}</div><footer><span>{view === 'student' ? 'Submitted response' : view === 'ai' ? 'AI suggestion' : 'Reference answer'}</span><strong>{countWords(displayed)} words</strong></footer></article>;
}

export default function WritingResultDetailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const historyIdParam = params.get('historyId');
  const session = useMemo(() => {
    if (historyIdParam) {
      const stored = localStorage.getItem(`history_data_${historyIdParam}`);
      if (stored) return JSON.parse(stored);
    }
    return getWritingSession();
  }, [historyIdParam]);
  const isFull = params.get('isFull') === 'true' || session.mode === 'full';
  const initialPart = params.get('part') && WRITING_PART_ORDER.includes(params.get('part')) ? params.get('part') : 'part1';
  const [activePart, setActivePart] = useState(initialPart);
  const [view, setView] = useState('student');
  const visibleParts = isFull ? WRITING_PART_ORDER : [initialPart];
  const task = getAdminWritingTask(session.testId, activePart) || WRITING_TASKS[activePart];
  const answers = session.answers?.[activePart] || {};
  const assessment = getWritingAssessment(session, [activePart]);

  return <div className={styles.page}><main><button className={styles.back} onClick={() => navigate(-1)}><ArrowLeft />Back</button><div className={styles.title}><div><span>WRITING RESULT</span><h1>{task.title}</h1></div><strong>{assessment.band}</strong></div>{isFull && <nav className={styles.partTabs}>{visibleParts.map((part, index) => <button key={part} className={activePart === part ? styles.active : ''} onClick={() => setActivePart(part)}>Part {index + 1}</button>)}</nav>}<section className={styles.report}><div><h2>AI Assessment</h2><p>{assessment.feedback}</p></div><div className={styles.criteria}>{assessment.criteria.map((criterion) => <WritingScoreRing compact key={criterion.key} score={criterion.score} label={criterion.label} />)}</div></section><nav className={styles.viewTabs}>{views.map((item) => <button key={item.key} className={view === item.key ? styles.active : ''} onClick={() => setView(item.key)}>{item.label}</button>)}</nav><div className={styles.layout}><section className={styles.responses}><div className={styles.instruction}><strong>Instruction</strong><p>{task.instruction}</p></div>{task.questions.map((_, index) => <ResponseCard key={index} part={activePart} index={index} answer={answers[index] || ''} view={view} task={task} />)}</section><aside><h2>Detailed feedback</h2><div><strong>Task Achievement</strong><p>{assessment.criteria[0].score >= 75 ? 'The response covers the task and stays close to the recommended length.' : 'Address every part of the prompt and check the recommended length.'}</p></div><div><strong>Coherence & Cohesion</strong><p>Organise ideas in a logical order and use linking words only where they make the relationship between ideas clearer.</p></div><div><strong>Lexical Resource</strong><p>Prefer precise, natural vocabulary and avoid repeating the same words across consecutive sentences.</p></div><div><strong>Grammar Accuracy</strong><p>Check verb forms, sentence boundaries, articles and punctuation before submitting.</p></div><small>AI feedback shown here is mock frontend data until the assessment API is connected.</small></aside></div><button className={styles.another} onClick={() => navigate('/writing/tests')}>Take another test</button></main></div>;
}
