import {PlacementControl,PlacementCoverage} from '../shared-test-builder/PlacementControl';
import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminConfirmDialog, AdminValidationToast } from '../components/AdminFeedback';
import AdminBreadcrumb from '../components/AdminBreadcrumb';
import { Field } from '../shared-test-builder/BuilderFields';
import ImageField from '../shared-test-builder/ImageField';
import PartSummaryCard from '../writing/components/PartSummaryCard';
import { useSpeakingBuilder } from './context/SpeakingBuilderContext';
import { SPEAKING_PARTS } from './data/speakingTestModel';
import { getApiError } from '../../../services/apiError';
import { validateSpeakingTest } from './validation/speakingValidation';
import styles from '../writing/WritingTestDetailsPage.module.css';

export default function SpeakingTestDetailsPage() {
  const ui = useUiTranslation();
  const { test, setTest, updateDetails, goTo, saveDraft, publishTest } = useSpeakingBuilder();
  const navigate = useNavigate();
  const [errors, setErrors] = useState([]);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const parts = SPEAKING_PARTS.filter((part) => test.mode === 'full' || test.mode === `part${part.number}`);
  const requestSave = () => { if (saving) return; const next = validateSpeakingTest(test); setErrors(next); if (!next.length) setConfirm(true); };
  const persist = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await publishTest();
      navigate(`/admin/tests/speaking/${saved.id}/preview`, { state: { toast: test.id ? 'Speaking test updated successfully.' : 'Speaking test created successfully.' } });
    } catch (err) {
      setErrors([getApiError(err, ui("Unable to save or publish the test. Your draft is preserved."))]);
    } finally { setConfirm(false); setSaving(false); }
  };
  const saveInformation = async () => {
    if (saving) return;
    setSaving(true);
    try { await saveDraft(); await goTo(); }
    catch (error) { setErrors([getApiError(error, ui("Unable to save the draft. Your local changes are preserved."))]); }
    finally { setSaving(false); }
  };
  return <div className={styles.page}>
    <AdminValidationToast errors={errors} onClose={() => setErrors([])} />
    <AdminConfirmDialog open={confirm} title={test.id ? ui("Save changes to this Speaking test?") : ui("Create Speaking test?")} message="The test will be displayed in Test Management and the candidate Speaking test list." confirmLabel={test.id ? ui("Save changes") : ui("Create test")} onCancel={() => setConfirm(false)} onConfirm={persist} />
    <AdminBreadcrumb current={test.details.title || 'New Speaking test'} purpose={test.purpose} />
    <section className={styles.information} inert={saving ? '' : undefined}><h2>{ui("INFORMATION TEST")}</h2><div className={styles.infoGrid}><div className={styles.fields}><Field label={ui("Title")} value={test.details.title} onChange={(value) => updateDetails('title', value)} /><PlacementCoverage /><PlacementControl test={test} onChange={value=>setTest(current=>({...current,isPlacement:value}))} />
          <ImageField label={ui("Test cover")} value={test.details.pictureUrl} onChange={(value) => updateDetails('pictureUrl', value)} /><button className={styles.saveInfo} disabled={saving} onClick={saveInformation}>{ui("Save draft")}</button></div><aside><b>{ui("Preview")}</b><div><header><span>{test.mode === 'full' ? ui("Full test") : test.mode.replace('part', 'Part ')}</span></header>{test.details.pictureUrl ? <img src={test.details.pictureUrl} alt={ui("Test cover")} /> : <strong>AptiMate<br /><em>{ui("Speaking")}</em></strong>}<button onClick={requestSave}>{ui("Preview")}</button></div></aside></div></section>
    <section className={styles.content} inert={saving ? '' : undefined}><h2>{ui("CONTENT TEST")}</h2><div>{parts.map((part) => <PartSummaryCard key={part.number} part={part} onEdit={() => goTo(part.number)} />)}</div><button className={styles.saveAll} onClick={requestSave}>{test.id ? ui("Update test & preview") : ui("Save test & preview")}</button></section>
  </div>;
}
