import { lazy, Suspense, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminValidationToast } from '../components/AdminFeedback';
import { LISTENING_PARTS } from './data/listeningTestModel';
import { useListeningBuilder } from './context/ListeningBuilderContext';
import { validateListeningPart } from './validation/listeningValidation';
import { revealFirstEditorError } from '../shared-test-builder/editorNavigation';
import EditorBackButton from '../shared-test-builder/EditorBackButton';
import styles from '../reading/components/ReadingEditor.module.css';

const editors = [
  lazy(() => import('./editors/Part1Editor')),
  lazy(() => import('./editors/Part2Editor')),
  lazy(() => import('./editors/Part3Editor')),
  lazy(() => import('./editors/Part4Editor')),
];

export default function ListeningPartEditorPage() {
  const { partNumber } = useParams();
  const number = Number(partNumber);
  const { test, updatePart, basePath } = useListeningBuilder();
  const navigate = useNavigate();
  const [errors, setErrors] = useState([]);
  if (!editors[number - 1] || (test.mode !== 'full' && test.mode !== `part${number}`)) return <p>Part not available.</p>;
  const Editor = editors[number - 1];
  const save = () => {
    const next = validateListeningPart(number, test.parts[number]);
    setErrors(next);
    if (!next.length) navigate(basePath);
    else revealFirstEditorError(next);
  };
  return <main className={styles.page}>
    <AdminValidationToast errors={errors} onClose={() => setErrors([])}/>
    <EditorBackButton onClick={() => navigate(basePath)}/>
    <header className={styles.summary}><strong>Part {number} · {LISTENING_PARTS[number - 1].title}</strong><div>{LISTENING_PARTS[number - 1].summary}</div></header>
    <Suspense fallback={<p>Loading editor…</p>}><Editor value={test.parts[number]} onChange={value => updatePart(number, value)}/></Suspense>
    <div className={styles.actions}><button onClick={save}>Save change</button></div>
  </main>;
}
