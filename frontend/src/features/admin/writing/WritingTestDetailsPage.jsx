import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminConfirmDialog } from '../components/AdminFeedback';
import ImageField from '../shared-test-builder/ImageField';
import { useWritingTestBuilder } from './context/WritingTestBuilderContext';
import { WRITING_PART_META } from './data/writingBuilderInitialState';
import { saveStoredWritingTest } from './data/writingTestStorage';
import PartSummaryCard from './components/PartSummaryCard';
import { hasValidationErrors, hasWritingTestErrors, validateWritingDetails, validateWritingTest } from './validation/writingTestValidation';
import styles from './WritingTestDetailsPage.module.css';

export default function WritingTestDetailsPage() {
  const navigate = useNavigate();
  const { test, updateDetails, basePath } = useWritingTestBuilder();
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [confirmSave, setConfirmSave] = useState(false);
  const visibleParts = test.mode === 'full' ? WRITING_PART_META : WRITING_PART_META.filter((part) => `part${part.number}` === test.mode);

  const saveInformation = () => {
    const next = validateWritingDetails(test.details);
    setErrors(next);
    if (!hasValidationErrors(next)) setMessage('Test information saved in the current draft.');
  };

  const validateBeforeSave = () => {
    const validation = validateWritingTest(test);
    setErrors(validation.details);
    if (!hasWritingTestErrors(validation)) return true;
    const incomplete = Object.entries(validation.parts).filter(([, value]) => hasValidationErrors(value)).map(([part]) => `Part ${part}`).join(', ');
    setMessage(`Complete all required content${incomplete ? ` in ${incomplete}` : ''} before saving.`);
    return false;
  };

  const persistTest = () => {
    setConfirmSave(false);
    try {
      const saved = saveStoredWritingTest(test);
      navigate(`/admin/tests/writing/${saved.id}/preview`, { state: { toast: test.id ? 'Writing test updated successfully.' : 'Writing test created successfully.' } });
    } catch {
      setMessage('The image is too large to save in this browser. Please upload a smaller image.');
    }
  };

  const requestSave = () => {
    if (!validateBeforeSave()) return;
    if (test.id) setConfirmSave(true);
    else persistTest();
  };

  return <div className={styles.page}>
    <AdminConfirmDialog open={confirmSave} title="Save changes to this test?" message="Your current changes will replace the previously saved version of this Writing test." confirmLabel="Save changes" onCancel={() => setConfirmSave(false)} onConfirm={persistTest}/>
    <div className={styles.crumb}><b>Test Management</b><ChevronRight/><b>Admin</b><ChevronRight/><span>{test.details.title || 'New test'}</span></div>
    <section className={styles.information}><h2>INFORMATION TEST</h2><div className={styles.infoGrid}><div className={styles.fields}>
      <label><b>Title:</b><input value={test.details.title} onChange={(event) => updateDetails('title', event.target.value)}/>{errors.title && <small>{errors.title}</small>}</label>
      <ImageField label="Test cover" value={test.details.pictureUrl} onChange={(value) => updateDetails('pictureUrl', value)}/>
      <button className={styles.saveInfo} onClick={saveInformation}>Save</button>{message && <p className={styles.message}>{message}</p>}
    </div><aside><b>Preview</b><div><header><span>{test.mode === 'full' ? 'Full test' : test.mode.replace('part', 'Part ')}</span><small>Not Started</small></header>{test.details.pictureUrl ? <img src={test.details.pictureUrl} alt="Test preview"/> : <strong>AptiMate<br/><em>Writing</em></strong>}<button onClick={requestSave}>Preview</button></div></aside></div></section>
    <section className={styles.content}><h2>CONTENT TEST</h2><div>{visibleParts.map((part) => <PartSummaryCard key={part.number} part={part} onEdit={() => navigate(`${basePath}/part/${part.number}`)}/>)}</div><button className={styles.saveAll} onClick={requestSave}>{test.id ? 'Update test & preview' : 'Save test & preview'}</button></section>
  </div>;
}
