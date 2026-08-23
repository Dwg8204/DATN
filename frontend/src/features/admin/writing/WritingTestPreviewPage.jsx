import { ArrowLeft, Edit3 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getStoredWritingTest } from './data/writingTestStorage';
import styles from './WritingTestPreviewPage.module.css';

export default function WritingTestPreviewPage() {
  const navigate = useNavigate();
  const { testId } = useParams();
  const test = getStoredWritingTest(testId);
  if (!test) return <section className={styles.empty}><h2>Test not found</h2><button onClick={() => navigate('/admin/tests')}>Back to Test Management</button></section>;
  const { details, parts } = test;
  return <div className={styles.page}><header><button onClick={() => navigate('/admin/tests')}><ArrowLeft />Back</button><div><span>WRITING TEST PREVIEW</span><h1>{details.title}</h1><p>{details.source}</p></div><button className={styles.edit} onClick={() => navigate('/admin/tests/new/writing')}><Edit3 />Edit test</button></header>{details.pictureUrl && <img className={styles.cover} src={details.pictureUrl} alt={details.title} />}<section><h2>Part 1 · Word completion</h2><p>{parts[1].context}</p><ol>{parts[1].questions.map((question, index) => <li key={index}>{question || <em>Question has not been completed</em>}</li>)}</ol></section><section><h2>Part 2 · Short text writing</h2><p>{parts[2].instruction}</p><div className={styles.prompt}>{parts[2].prompt}</div>{parts[2].sampleAnswer && <><h3>Sample essay</h3><p>{parts[2].sampleAnswer}</p></>}</section><section><h2>Part 3 · Three written responses</h2><p>{parts[3].context}</p>{parts[3].messages.map((message, index) => <article key={index}><b>Member {index + 1}</b><p>{message || <em>Message has not been completed</em>}</p></article>)}</section><section><h2>Part 4 · Formal and informal writing</h2><p>{parts[4].context}</p><h3>Informal email</h3><p>{parts[4].informalPrompt}</p><h3>Formal email</h3><p>{parts[4].formalPrompt}</p></section></div>;
}
