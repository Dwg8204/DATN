import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AdminConfirmDialog, AdminToast, AdminValidationToast } from '../components/AdminFeedback';
import SpeakingAnswerPreview from './components/SpeakingAnswerPreview';
import { SPEAKING_PARTS } from './data/speakingTestModel';
import { speakingTestsApi } from './services/speakingTestsApi';
import { validateSpeakingTest } from './validation/speakingValidation';
import styles from '../reading/components/ReadingEditor.module.css';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState';

const PREVIEW_QUERY_SCHEMA = { activePart: { ...queryParam.positiveInt(1, 4), param: 'part' } };

export default function SpeakingTestPreviewPage(){
  const ui = useUiTranslation();
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [errors, setErrors] = useState([]);
  const [urlState, setUrlState] = useUrlQueryState(PREVIEW_QUERY_SCHEMA);

  useEffect(()=>{speakingTestsApi.getOne(testId).then(setTest).catch(()=>{}).finally(()=>setLoading(false))},[testId]);

  const parts = SPEAKING_PARTS.filter(part=>test&&(test.mode==='full'||test.mode===`part${part.number}`));
  const activePart = parts.some(part => part.number === urlState.activePart) ? urlState.activePart : parts[0]?.number || 1;

  const requestPublish = () => {
    const next = validateSpeakingTest(test);
    if (next.length) { setErrors(next); return; }
    setConfirmPublish(true);
  };

  const publish = async () => {
    try {
      await speakingTestsApi.publish(test.id, test.version || 1);
      navigate(location.pathname, { replace: true, state: { toast: 'Speaking test published successfully.' } });
      setTest({ ...test, status: 'PUBLISHED' });
    } catch (e) {
      setErrors([e?.response?.data?.message || 'Unable to publish the test.']);
    } finally {
      setConfirmPublish(false);
    }
  };

  if(loading)return <div style={{padding: '2rem', textAlign: 'center'}}>{ui("Loading test preview...")}</div>;
  if(!test)return<p>{ui("Test not found.")}</p>;

  return <main className={styles.page}>
    <AdminToast message={location.state?.toast} onClose={()=>navigate(location.pathname,{replace:true,state:{}})}/>
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
      <button onClick={()=>navigate(`/admin/tests?purpose=${test.purpose ?? 'EXAM'}`)}>{ui("Back to Test Management")}</button>
      <button onClick={()=>navigate(`/admin/tests/speaking/${test.id}/edit`)}>{ui("Edit test")}</button>
      {test.status !== 'PUBLISHED' && <button className={styles.primaryAction} onClick={requestPublish}>{ui("Publish")}</button>}
    </div>
    <header className={styles.summary}>
      <h2>{test.details?.title} {test.status === 'PUBLISHED' && <span style={{fontSize: '0.6em', padding: '2px 6px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', verticalAlign: 'middle', marginLeft: '8px'}}>{ui("Published")}</span>}</h2>
      <p>{ui("Speaking · Candidate-view preview · Fixed Aptis response times are shown with each task.")}</p>
    </header>
    <nav className={styles.previewTabs}>
      {parts.map(part=><button aria-pressed={activePart===part.number} key={part.number} onClick={()=>setUrlState({ activePart: part.number })}>{ ui("Part") + ' ' }{part.number} · {ui(part.title)}</button>)}
    </nav>
    <SpeakingAnswerPreview test={test} part={activePart}/>
  </main>
}
