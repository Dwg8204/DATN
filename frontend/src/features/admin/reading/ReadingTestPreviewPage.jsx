import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AdminToast } from '../components/AdminFeedback';
import { getStoredReadingTest } from './data/readingTestStorage';
import { READING_PARTS } from './data/readingTestModel';
import ReadingAnswerPreview from '../../module-reading/components/ReadingAnswerPreview';
import styles from './components/ReadingEditor.module.css';

export default function ReadingTestPreviewPage() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [test] = useState(() => getStoredReadingTest(testId));
  const parts = READING_PARTS.filter(part => test?.mode === 'full' || test?.mode === `part${part.number}`);
  const [activePart, setActivePart] = useState(parts[0]?.number || 1);
  if (!test) return <p>Test not found.</p>;

  return <main className={styles.page}>
    <AdminToast message={location.state?.toast} onClose={() => navigate(location.pathname, { replace: true, state: {} })} />
    <div className={styles.actions}>
      <button onClick={() => navigate('/admin/tests')}>Back to Test Management</button>
      <button onClick={() => navigate(`/admin/tests/reading/${test.id}/edit`)}>Edit test</button>
    </div>
    <header className={styles.summary}>
      <h2>{test.title}</h2>
      <p>Reading · Answer preview · Correct answers are highlighted in green.</p>
    </header>
    <nav className={styles.previewTabs} aria-label="Preview parts">
      {parts.map(part => <button key={part.number} aria-pressed={activePart === part.number} onClick={() => setActivePart(part.number)}>
        Part {part.number} · {part.title}
      </button>)}
    </nav>
    <ReadingAnswerPreview test={test} part={activePart} />
  </main>;
}
