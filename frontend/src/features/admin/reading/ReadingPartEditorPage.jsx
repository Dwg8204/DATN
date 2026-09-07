import { lazy, Suspense, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminValidationToast } from '../components/AdminFeedback';
import EditorBackButton from '../shared-test-builder/EditorBackButton';
import { revealFirstEditorError } from '../shared-test-builder/editorNavigation';
import { useReadingBuilder } from './context/ReadingBuilderContext';
import { READING_PARTS } from './data/readingTestModel';
import { validateReadingPart } from './validation/readingValidation';
import styles from './components/ReadingEditor.module.css';

const editors = [
  lazy(() => import('./editors/GapFillingEditor')),
  lazy(() => import('./editors/TextCohesionEditor')),
  lazy(() => import('./editors/OpinionMatchingEditor')),
  lazy(() => import('./editors/HeadingMatchingEditor')),
];

export default function ReadingPartEditorPage() {
  const { partNumber } = useParams();
  const number = Number(partNumber);
  const { test, setTest, basePath } = useReadingBuilder();
  const navigate = useNavigate();
  const [errors, setErrors] = useState([]);
  if (!editors[number - 1] || (test.mode !== 'full' && test.mode !== `part${number}`)) return <p>Part not available.</p>;
  const Editor = editors[number - 1];
  const save = () => {
    const next = validateReadingPart(number, test[`part${number}`]);
    setErrors(next);
    if (!next.length) navigate(basePath);
    else revealFirstEditorError(next);
  };
  return <main className={styles.page}>
    <AdminValidationToast errors={errors} onClose={() => setErrors([])}/>
    <EditorBackButton onClick={() => navigate(basePath)}/>
    <header className={styles.summary}><strong>Part {number} · {READING_PARTS[number - 1].title}</strong><div>{READING_PARTS[number - 1].summary}</div></header>
    <Suspense fallback={<p>Loading editor…</p>}><Editor value={test[`part${number}`]} onChange={part => setTest(current => ({ ...current, [`part${number}`]: part }))}/></Suspense>
    <div className={styles.actions}><button onClick={save}>Save change</button></div>
  </main>;
}
