import { lazy, Suspense, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReadingBuilder } from './context/ReadingBuilderContext';
import { READING_PARTS } from './data/readingTestModel';
import { validateReadingPart } from './validation/readingValidation';
import styles from './components/ReadingEditor.module.css';
import { AdminValidationToast } from '../components/AdminFeedback';
const editors = [lazy(() => import('./editors/GapFillingEditor')), lazy(() => import('./editors/TextCohesionEditor')), lazy(() => import('./editors/OpinionMatchingEditor')), lazy(() => import('./editors/HeadingMatchingEditor'))];
export default function ReadingPartEditorPage() {
  const {
    partNumber
  } = useParams();
  const n = Number(partNumber);
  const {
    test,
    setTest,
    basePath
  } = useReadingBuilder();
  const navigate = useNavigate();
  const [errors, setErrors] = useState([]);
  if (!editors[n - 1] || test.mode !== 'full' && test.mode !== `part${n}`) return <p>Part not available.</p>;
  const Editor = editors[n - 1];
  const save = () => {
    const next = validateReadingPart(n, test[`part${n}`]);
    setErrors(next);
    if (!next.length) navigate(basePath);
  };
  return <main className={styles.page}><AdminValidationToast errors={errors} onClose={() => setErrors([])} /><div className={styles.actions}><button onClick={() => navigate(basePath)}>Back to test information</button></div><header className={styles.summary}><strong>Part {n} · {READING_PARTS[n - 1].title}</strong><div>{READING_PARTS[n - 1].summary}</div></header><Suspense fallback={<p>Loading editor…</p>}><Editor value={test[`part${n}`]} onChange={part => setTest(current => ({
        ...current,
        [`part${n}`]: part
      }))} /></Suspense><div className={styles.actions}><button onClick={save}>Save change</button></div></main>;
}
