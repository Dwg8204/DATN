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
  const navigate = useNavigate();
  const { test, updateDetails, basePath, saveDraft, replaceTest } = useWritingTestBuilder();
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
      const saved = await saveDraft();
      showSuccess('Writing test draft saved.');
      if (!test.id) navigate(`/admin/tests/writing/${saved.id}/edit`, { replace: true });
    } catch (error) {
      showError(getApiError(error, 'Unable to save this Writing test draft.'));
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
        showError(`Part ${part}: ${message}`);
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
    let draft;
    try {
      draft = await saveDraft(test);
      const published = await writingTestsApi.publish(draft.id);
      replaceTest(published);
      showSuccess(test.id ? 'Writing test updated and published.' : 'Writing test created and published.');
      navigate(`/admin/tests/writing/${published.id}/preview`);
    } catch (error) {
      showError(getApiError(error, 'Unable to save or publish this Writing test. Your draft is preserved when it was saved successfully.'));
      if (draft && !test.id) navigate(`/admin/tests/writing/${draft.id}/edit`, { replace: true });
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
    <AdminConfirmDialog open={confirmSave} title="Save changes to this test?" message="Your current changes will replace the previously saved version of this Writing test." confirmLabel="Save changes" onCancel={() => setConfirmSave(false)} onConfirm={persistTest}/>
    <AdminBreadcrumb current={test.details.title || 'New test'} />
    <section className={styles.information} inert={saving ? '' : undefined} aria-busy={saving}><h2>INFORMATION TEST</h2><div className={styles.infoGrid}><div className={styles.fields}>
      <label><b>Title:</b><input value={test.details.title} onChange={(event) => updateDetails('title', event.target.value)}/></label>
      <ImageField label="Test cover" value={test.details.pictureUrl} onChange={(value) => updateDetails('pictureUrl', value)} uploadFile={writingTestsApi.uploadCover}/>
      <button className={styles.saveInfo} onClick={saveInformation} disabled={saving}>{saving ? 'Saving…' : 'Save draft'}</button>
    </div><aside><b>Preview</b><div><header><span>{test.mode === 'full' ? 'Full test' : test.mode.replace('part', 'Part ')}</span><small>{test.status === 'PUBLISHED' ? 'Published' : 'Draft'}</small></header>{test.details.pictureUrl ? <img src={test.details.pictureUrl} alt="Test preview"/> : <strong>AptiMate<br/><em>Writing</em></strong>}<button onClick={requestSave} disabled={saving}>{test.status === 'PUBLISHED' ? 'Update & preview' : 'Publish & preview'}</button></div></aside></div></section>
    <section className={styles.content} inert={saving ? '' : undefined}><h2>CONTENT TEST</h2><div>{visibleParts.map((part) => <PartSummaryCard key={part.number} part={part} onEdit={() => navigate(`${basePath}/part/${part.number}${test.id ? '' : `?mode=${test.mode}`}`)}/>)}</div><button className={styles.saveAll} onClick={requestSave} disabled={saving}>{saving ? 'Saving…' : test.status === 'PUBLISHED' ? 'Update & publish test' : 'Publish test & preview'}</button></section>
  </div>;
}
