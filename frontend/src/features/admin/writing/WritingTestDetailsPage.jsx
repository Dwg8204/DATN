import {PlacementControl,PlacementCoverage} from '../shared-test-builder/PlacementControl';
import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminConfirmDialog } from '../components/AdminFeedback';
import AdminBreadcrumb from '../components/AdminBreadcrumb';
import ImageField from '../shared-test-builder/ImageField';
import { useWritingTestBuilder } from './context/WritingTestBuilderContext';
import { WRITING_PART_META } from './data/writingBuilderInitialState';
import PartSummaryCard from './components/PartSummaryCard';
import { validateWritingDetails, validateWritingTest } from './validation/writingTestValidation';
import { useToast } from '../../../context/ToastContext';
import { getFirstValidationError } from '../../../utils/validationErrors';
import { getApiError } from '../../../services/apiError';
import styles from './WritingTestDetailsPage.module.css';
import { writingTestsApi } from './services/writingTestsApi';

export default function WritingTestDetailsPage() {
  const ui = useUiTranslation();
  const navigate = useNavigate();
  const { test, setTest, updateDetails, goTo, saveDraft, publishTest } = useWritingTestBuilder();
  const { showError, showSuccess, dismissToast } = useToast();
  const [confirmSave, setConfirmSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const visibleParts = test.mode === 'full' ? WRITING_PART_META : WRITING_PART_META.filter((part) => `part${part.number}` === test.mode);

  const saveInformation = async () => {
    const message = getFirstValidationError(validateWritingDetails(test.details));
    if (message) return showError(message);
    if (saving) return;
    setSaving(true);
    try {
      await saveDraft();
      showSuccess(ui("Writing test draft saved."));
      await goTo();
    } catch (error) {
      showError(getApiError(error, ui("Unable to save this Writing test draft.")));
    } finally {
      setSaving(false);
    }
  };

  const validateBeforeSave = () => {
    const validation = validateWritingTest(test);
    const detailsError = getFirstValidationError(validation.details);
    if (detailsError) {
      showError(detailsError);
      return false;
    }
    for (const [part, errors] of Object.entries(validation.parts)) {
      const message = getFirstValidationError(errors);
      if (message) {
        showError(ui("Part {{value0}}: {{value1}}", {value0:(part),value1:(message)}));
        return false;
      }
    }
    dismissToast();
    return true;
  };

  const persistTest = async () => {
    if (saving) return;
    setConfirmSave(false);
    setSaving(true);
    try {
      const published = await publishTest();
      showSuccess(test.id ? ui("Writing test updated and published.") : ui("Writing test created and published."));
      navigate(`/admin/tests/writing/${published.id}/preview`);
    } catch (error) {
      showError(getApiError(error, ui("Unable to save or publish this Writing test. Your draft is preserved when it was saved successfully.")));
    } finally {
      setSaving(false);
    }
  };

  const requestSave = () => {
    if (saving) return;
    if (!validateBeforeSave()) return;
    if (test.id) setConfirmSave(true);
    else persistTest();
  };

  return <div className={styles.page}>
    <AdminConfirmDialog open={confirmSave} title={ui("Save changes to this test?")} message="Your current changes will replace the previously saved version of this Writing test." confirmLabel={ui("Save changes")} onCancel={() => setConfirmSave(false)} onConfirm={persistTest}/>
    <AdminBreadcrumb current={test.details.title || 'New test'} purpose={test.purpose} />
    <section className={styles.information} inert={saving ? '' : undefined} aria-busy={saving}><h2>{ui("INFORMATION TEST")}</h2><div className={styles.infoGrid}><div className={styles.fields}>
      <label><b>{ui("Title:")}</b><input value={test.details.title} onChange={(event) => updateDetails('title', event.target.value)}/></label>
      <PlacementCoverage /><PlacementControl test={test} onChange={value=>setTest(current=>({...current,isPlacement:value}))} />
          <ImageField label={ui("Test cover")} value={test.details.pictureUrl} onChange={(value) => updateDetails('pictureUrl', value)} uploadFile={writingTestsApi.uploadCover}/>
      <button className={styles.saveInfo} onClick={saveInformation} disabled={saving}>{saving ? ui("Saving…") : ui("Save draft")}</button>
    </div><aside><b>{ui("Preview")}</b><div><header><span>{test.mode === 'full' ? ui("Full test") : test.mode.replace('part', 'Part ')}</span><small>{test.status === 'PUBLISHED' ? ui("Published") : ui("Draft")}</small></header>{test.details.pictureUrl ? <img src={test.details.pictureUrl} alt={ui("Test preview")}/> : <strong>AptiMate<br/><em>{ui("Writing")}</em></strong>}<button onClick={requestSave} disabled={saving}>{test.status === 'PUBLISHED' ? ui("Update & preview") : ui("Publish & preview")}</button></div></aside></div></section>
    <section className={styles.content} inert={saving ? '' : undefined}><h2>{ui("CONTENT TEST")}</h2><div>{visibleParts.map((part) => <PartSummaryCard key={part.number} part={part} onEdit={() => goTo(part.number)}/>)}</div><button className={styles.saveAll} onClick={requestSave} disabled={saving}>{saving ? ui("Saving…") : test.status === 'PUBLISHED' ? ui("Update & publish test") : ui("Publish test & preview")}</button></section>
  </div>;
}
