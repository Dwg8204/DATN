import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminConfirmDialog } from '../components/AdminFeedback';
import AdminBreadcrumb from '../components/AdminBreadcrumb';
import ImageField from '../shared-test-builder/ImageField';
import { useWritingTestBuilder } from './context/WritingTestBuilderContext';
import { WRITING_PART_META } from './data/writingBuilderInitialState';
import { saveStoredWritingTest } from './data/writingTestStorage';
import PartSummaryCard from './components/PartSummaryCard';
import { validateWritingDetails, validateWritingTest } from './validation/writingTestValidation';
import { useToast } from '../../../context/ToastContext';
import { getFirstValidationError } from '../../../utils/validationErrors';
import styles from './WritingTestDetailsPage.module.css';

export default function WritingTestDetailsPage() {
  const navigate = useNavigate();
  const { test, updateDetails, basePath } = useWritingTestBuilder();
  const { showError, showSuccess, dismissToast } = useToast();
  const [confirmSave, setConfirmSave] = useState(false);
  const visibleParts = test.mode === 'full' ? WRITING_PART_META : WRITING_PART_META.filter((part) => `part${part.number}` === test.mode);

  const saveInformation = () => {
    const message = getFirstValidationError(validateWritingDetails(test.details));
    if (message) return showError(message);
    showSuccess('Test information saved in the current draft.');
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

  const persistTest = () => {
    setConfirmSave(false);
    try {
      const saved = saveStoredWritingTest(test);
      showSuccess(test.id ? 'Writing test updated successfully.' : 'Writing test created successfully.');
      navigate(`/admin/tests/writing/${saved.id}/preview`);
    } catch {
      showError('Unable to save the test. Browser storage may be full. Please try a smaller cover image.');
    }
  };

  const requestSave = () => {
    if (!validateBeforeSave()) return;
    if (test.id) setConfirmSave(true);
    else persistTest();
  };

  return <div className={styles.page}>
    <AdminConfirmDialog open={confirmSave} title="Save changes to this test?" message="Your current changes will replace the previously saved version of this Writing test." confirmLabel="Save changes" onCancel={() => setConfirmSave(false)} onConfirm={persistTest}/>
    <AdminBreadcrumb current={test.details.title || 'New test'} />
    <section className={styles.information}><h2>INFORMATION TEST</h2><div className={styles.infoGrid}><div className={styles.fields}>
      <label><b>Title:</b><input value={test.details.title} onChange={(event) => updateDetails('title', event.target.value)}/></label>
      <ImageField label="Test cover" value={test.details.pictureUrl} onChange={(value) => updateDetails('pictureUrl', value)}/>
      <button className={styles.saveInfo} onClick={saveInformation}>Save</button>
    </div><aside><b>Preview</b><div><header><span>{test.mode === 'full' ? 'Full test' : test.mode.replace('part', 'Part ')}</span><small>Not Started</small></header>{test.details.pictureUrl ? <img src={test.details.pictureUrl} alt="Test preview"/> : <strong>AptiMate<br/><em>Writing</em></strong>}<button onClick={requestSave}>Preview</button></div></aside></div></section>
    <section className={styles.content}><h2>CONTENT TEST</h2><div>{visibleParts.map((part) => <PartSummaryCard key={part.number} part={part} onEdit={() => navigate(`${basePath}/part/${part.number}`)}/>)}</div><button className={styles.saveAll} onClick={requestSave}>{test.id ? 'Update test & preview' : 'Save test & preview'}</button></section>
  </div>;
}
