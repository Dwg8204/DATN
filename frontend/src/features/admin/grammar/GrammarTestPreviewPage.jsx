import { ArrowLeft, Edit3 } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AdminToast } from '../components/AdminFeedback';
import { getStoredGrammarTest } from './data/grammarTestStorage';
import styles from './GrammarTestPreviewPage.module.css';

export default function GrammarTestPreviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { testId } = useParams();
  const test = getStoredGrammarTest(testId);
  if (!test) return <div>Test not found.</div>;
  const parts = test.mode === 'full' ? [1, 2] : [Number(test.mode.replace('part', ''))];
  const modeLabel = test.mode === 'full' ? 'Full Test' : test.mode.replace('part', 'Part ');

  return <div className={styles.page}>
    <AdminToast message={location.state?.toast} onClose={() => navigate(location.pathname, { replace: true, state: {} })} />
    <header>
      <button onClick={() => navigate('/admin/tests')}><ArrowLeft />Back</button>
      <div><span>GRAMMAR & VOCABULARY PREVIEW</span><h1>{test.details.title}</h1><p>{modeLabel}</p></div>
      <button className={styles.edit} onClick={() => navigate(`/admin/tests/grammar/${test.id}/edit`)}><Edit3 />Edit test</button>
    </header>
    {parts.includes(1) && <section><h2>Part 1 · Grammar</h2><p>{test.parts[1].instruction}</p><div className={styles.questions}>{test.parts[1].questions.map((question, index) => <article key={question.id}><b>{index + 1}. {question.text}</b>{question.options.map((option, optionIndex) => <span className={optionIndex === question.correctAnswer ? styles.correct : ''} key={optionIndex}>{String.fromCharCode(65 + optionIndex)}. {option}</span>)}</article>)}</div></section>}
    {parts.includes(2) && <section><h2>Part 2 · Vocabulary</h2>{test.parts[2].sets.map((set, index) => <article className={styles.set} key={set.setId}><h3>Questions {26 + index * 5}–{30 + index * 5}</h3><p>{set.instruction}</p><div>{set.targetWords.map(target => <span key={target.id}><b>{target.word}</b> = {target.correctAnswer}. {set.options.find(option => option.label === target.correctAnswer)?.text}</span>)}</div></article>)}</section>}
  </div>;
}
