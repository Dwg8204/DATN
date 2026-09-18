import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AdminConfirmDialog, AdminToast, AdminValidationToast } from '../components/AdminFeedback';
import { LISTENING_PARTS } from './data/listeningTestModel';
import ListeningAnswerPreview from './ListeningAnswerPreview';
import { listeningTestsApi } from './services/listeningTestsApi';
import { validateListeningTest } from './validation/listeningValidation';
import styles from '../reading/components/ReadingEditor.module.css';

export default function ListeningTestPreviewPage() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePart, setActivePart] = useState(1);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    listeningTestsApi.getAdmin(testId, controller.signal)
      .then(data => {
        setTest(data);
        const firstPart = LISTENING_PARTS.find(p => data.mode === 'full' || data.mode === `part${p.number}`);
        if (firstPart) setActivePart(firstPart.number);
        setLoading(false);
      })
      .catch(err => {
        if (err.code !== 'ERR_CANCELED') setLoading(false);
      });
    return () => controller.abort();
  }, [testId]);

  const requestPublish = () => {
    const next = validateListeningTest(test);
    if (next.length) {
      setErrors(next);
      return;
    }
    setConfirmPublish(true);
  };

  const publish = async () => {
    try {
      await listeningTestsApi.publish(test);
      navigate(location.pathname, { replace: true, state: { toast: 'Listening test published successfully.' } });
      setTest({ ...test, status: 'PUBLISHED' });
    } catch (e) {
      setErrors([e?.response?.data?.error?.message || 'Unable to publish the test.']);
    } finally {
      setConfirmPublish(false);
    }
  };

  if (loading) return <p className={styles.page}>Loading test...</p>;
  if (!test) return <p className={styles.page}>Test not found.</p>;

  const parts = LISTENING_PARTS.filter(part => test.mode === 'full' || test.mode === `part${part.number}`);

  return <main className={styles.page}>
    <AdminToast message={location.state?.toast} onClose={() => navigate(location.pathname, { replace: true, state: {} })} />
    <AdminValidationToast errors={errors} onClose={() => setErrors([])} />
    <AdminConfirmDialog 
      open={confirmPublish} 
      title="Publish this test?" 
      message="Once published, this test will be visible to learners. You can still edit it later, but structural changes might affect existing attempts." 
      confirmLabel="Publish test" 
      onCancel={() => setConfirmPublish(false)} 
      onConfirm={publish} 
    />
    
    <div className={styles.actions}>
      <button onClick={() => navigate('/admin/tests')}>Back to Test Management</button>
      <button onClick={() => navigate(`/admin/tests/listening/${test.id}/edit`)}>Edit test</button>
      {test.status !== 'PUBLISHED' && <button className={styles.primaryAction} onClick={requestPublish}>Publish</button>}
    </div>
    
    <header className={styles.summary}>
      <h2>{test.details?.title} {test.status === 'PUBLISHED' && <span style={{fontSize: '0.6em', padding: '2px 6px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', verticalAlign: 'middle', marginLeft: '8px'}}>Published</span>}</h2>
      <p>Listening · Answer preview · Correct answers are highlighted in green.</p>
    </header>
    
    <nav className={styles.previewTabs}>
      {parts.map(part => (
        <button aria-pressed={activePart === part.number} key={part.number} onClick={() => setActivePart(part.number)}>
          Part {part.number} · {part.title}
        </button>
      ))}
    </nav>
    
    <ListeningAnswerPreview test={test} part={activePart} />
  </main>;
}
