import { lazy, Suspense, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminValidationToast } from '../components/AdminFeedback';
import { useSpeakingBuilder } from './context/SpeakingBuilderContext';
import { SPEAKING_PARTS } from './data/speakingTestModel';
import { validateSpeakingPart } from './validation/speakingValidation';
import { revealFirstEditorError } from '../shared-test-builder/editorNavigation';
import EditorBackButton from '../shared-test-builder/EditorBackButton';
import styles from '../reading/components/ReadingEditor.module.css';

const editors = [
  lazy(() => import('./editors/Part1Editor')),
  lazy(() => import('./editors/Part2Editor')),
  lazy(() => import('./editors/Part3Editor')),
  lazy(() => import('./editors/Part4Editor')),
];

export default function SpeakingPartEditorPage() {
  const { partNumber } = useParams();
  const number = Number(partNumber);
  const { test, updatePart, basePath } = useSpeakingBuilder();
  const navigate = useNavigate();
  const [errors, setErrors] = useState([]);
  if (!editors[number - 1] || (test.mode !== 'full' && test.mode !== `part${number}`)) return <p>Part not available.</p>;
  const Editor = editors[number - 1];
  const save = () => {
    const next = validateSpeakingPart(number, test.parts[number]);
    setErrors(next);
    if (!next.length) navigate(basePath);
    else revealFirstEditorError(next);
  };
  return <main className={styles.page}>
    <AdminValidationToast errors={errors} onClose={() => setErrors([])}/>
    <EditorBackButton onClick={() => navigate(basePath)}/>
    <header className={styles.summary}><h2>Part {number} · {SPEAKING_PARTS[number - 1].title}</h2><p>{SPEAKING_PARTS[number - 1].summary}</p></header>
    <Suspense fallback={<p>Loading editor…</p>}><Editor value={test.parts[number]} onChange={value => updatePart(number, value)}/></Suspense>
    <div className={styles.actions}><button onClick={save}>Save change</button></div>
  </main>;
}
