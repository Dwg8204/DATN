import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AdminToast } from '../components/AdminFeedback';
import { readingTestsApi } from './services/readingTestsApi';
import { READING_PARTS } from './data/readingTestModel';
import ReadingAnswerPreview from '../../module-reading/components/ReadingAnswerPreview';
import styles from './components/ReadingEditor.module.css';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState';

const PREVIEW_QUERY_SCHEMA = { activePart: { ...queryParam.positiveInt(1, 4), param: 'part' } };

export default function ReadingTestPreviewPage() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [test, setTest] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    readingTestsApi.getOne(testId).then(value => { if (active) setTest(value); })
      .catch(() => { if (active) setError('Unable to load this Reading test.'); });
    return () => { active = false; };
  }, [testId]);
  const parts = READING_PARTS.filter(part => test?.mode === 'full' || test?.mode === `part${part.number}`);
  const [urlState, setUrlState] = useUrlQueryState(PREVIEW_QUERY_SCHEMA);
  const activePart = parts.some(part => part.number === urlState.activePart) ? urlState.activePart : parts[0]?.number || 1;
  const setActivePart = value => setUrlState({ activePart: value });
  if (error) return <p>{error}</p>;
  if (!test) return <p>Loading Reading test…</p>;

  return <main className={styles.page}>
    <AdminToast message={location.state?.toast} onClose={() => navigate(location.pathname, { replace: true, state: {} })} />
    <div className={styles.actions}>
      <button onClick={() => navigate(`/admin/tests?purpose=${test.purpose ?? 'EXAM'}`)}>Back to Test Management</button>
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
