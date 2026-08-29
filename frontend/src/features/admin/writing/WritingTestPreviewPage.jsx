import { ArrowLeft, Edit3 } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AdminToast } from '../components/AdminFeedback';
import { getStoredWritingTest } from './data/writingTestStorage';
import styles from './WritingTestPreviewPage.module.css';

function Part1({ part }) { return <section><h2>Part 1 · Word completion</h2><p>{part.context}</p><ol>{part.questions.map((question, index) => <li key={index}><strong>{question}</strong><span>Sample: {part.sampleAnswers[index]}</span></li>)}</ol></section>; }
function Part2({ part }) { return <section><h2>Part 2 · Short text writing</h2><p>{part.instruction}</p><div className={styles.prompt}>{part.prompt}</div><h3>Sample answer</h3><p>{part.sampleAnswer}</p></section>; }
function Part3({ part }) { return <section><h2>Part 3 · Three written responses</h2><p>{part.context}</p>{part.messages.map((message, index) => <article key={index}><b>Member {index + 1}</b><p>{message}</p><strong>Sample response</strong><p>{part.sampleAnswers[index]}</p></article>)}</section>; }
function Part4({ part }) { return <section><h2>Part 4 · Formal and informal writing</h2><p>{part.context}</p><h3>Informal email prompt</h3><p>{part.informalPrompt}</p><strong>Sample informal email</strong><p>{part.informalSample}</p><h3>Formal email prompt</h3><p>{part.formalPrompt}</p><strong>Sample formal email</strong><p>{part.formalSample}</p></section>; }

export default function WritingTestPreviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { testId } = useParams();
  const test = getStoredWritingTest(testId);
  const dismissToast = () => navigate(location.pathname, { replace: true, state: {} });
  if (!test) return <section className={styles.empty}><h2>Test not found</h2><button onClick={() => navigate('/admin/tests')}>Back to Test Management</button></section>;
  const visibleParts = test.mode === 'full' ? [1, 2, 3, 4] : [Number(test.mode.replace('part', ''))];
  return <div className={styles.page}><AdminToast message={location.state?.toast} onClose={dismissToast}/><header><button onClick={() => navigate('/admin/tests')}><ArrowLeft />Back</button><div><span>WRITING TEST PREVIEW · {test.mode === 'full' ? 'FULL TEST' : test.mode.replace('part', 'PART ')}</span><h1>{test.details.title}</h1><p>{test.details.source}</p></div><button className={styles.edit} onClick={() => navigate(`/admin/tests/writing/${test.id}/edit`)}><Edit3 />Edit test</button></header>{test.details.pictureUrl && <img className={styles.cover} src={test.details.pictureUrl} alt={test.details.title}/>} {visibleParts.includes(1) && <Part1 part={test.parts[1]}/>} {visibleParts.includes(2) && <Part2 part={test.parts[2]}/>} {visibleParts.includes(3) && <Part3 part={test.parts[3]}/>} {visibleParts.includes(4) && <Part4 part={test.parts[4]}/>}</div>;
}
