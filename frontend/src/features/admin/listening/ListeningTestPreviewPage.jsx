import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AdminConfirmDialog, AdminToast, AdminValidationToast } from '../components/AdminFeedback';
import { LISTENING_PARTS } from './data/listeningTestModel';
import ListeningAnswerPreview from './ListeningAnswerPreview';
import { listeningTestsApi } from './services/listeningTestsApi';
import { validateListeningTest } from './validation/listeningValidation';
import styles from '../reading/components/ReadingEditor.module.css';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState';

const PREVIEW_QUERY_SCHEMA = { activePart: { ...queryParam.positiveInt(1, 4), param: 'part' } };

export default function ListeningTestPreviewPage() {
  const ui = useUiTranslation();
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [urlState, setUrlState] = useUrlQueryState(PREVIEW_QUERY_SCHEMA);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    listeningTestsApi.getAdmin(testId, controller.signal)
      .then(data => {
        setTest(data);
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

  if (loading) return <p className={styles.page}>{ui("Loading test...")}</p>;
  if (!test) return <p className={styles.page}>{ui("Test not found.")}</p>;

  const parts = LISTENING_PARTS.filter(part => test.mode === 'full' || test.mode === `part${part.number}`);
  const activePart = parts.some(part => part.number === urlState.activePart) ? urlState.activePart : parts[0]?.number || 1;
  const setActivePart = value => setUrlState({ activePart: value });

  return <main className={styles.page}>
    <AdminToast message={location.state?.toast} onClose={() => navigate(location.pathname, { replace: true, state: {} })} />
    <AdminValidationToast errors={errors} onClose={() => setErrors([])} />
    <AdminConfirmDialog
      open={confirmPublish}
      title={ui("Publish this test?")}
      message="Once published, this test will be visible to learners. You can still edit it later, but structural changes might affect existing attempts."
      confirmLabel={ui("Publish test")}
      onCancel={() => setConfirmPublish(false)}
      onConfirm={publish}
    />

    <div className={styles.actions}>
      <button onClick={() => navigate(`/admin/tests?purpose=${test.purpose ?? 'EXAM'}`)}>{ui("Back to Test Management")}</button>
      <button onClick={() => navigate(`/admin/tests/listening/${test.id}/edit`)}>{ui("Edit test")}</button>
      {test.status !== 'PUBLISHED' && <button className={styles.primaryAction} onClick={requestPublish}>{ui("Publish")}</button>}
    </div>

    <header className={styles.summary}>
      <h2>{test.details?.title} {test.status === 'PUBLISHED' && <span style={{fontSize: '0.6em', padding: '2px 6px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', verticalAlign: 'middle', marginLeft: '8px'}}>{ui("Published")}</span>}</h2>
      <p>{ui("Listening · Answer preview · Correct answers are highlighted in green.")}</p>
    </header>

    <nav className={styles.previewTabs}>
      {parts.map(part => (
        <button aria-pressed={activePart === part.number} key={part.number} onClick={() => setActivePart(part.number)}>{ ui("Part") + ' ' }{part.number} · {ui(part.title)}
        </button>
      ))}
    </nav>

    <ListeningAnswerPreview test={test} part={activePart} />
  </main>;
}
