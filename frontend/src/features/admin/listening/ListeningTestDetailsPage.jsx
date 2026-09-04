import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminConfirmDialog, AdminValidationToast } from '../components/AdminFeedback';
import AdminBreadcrumb from '../components/AdminBreadcrumb';
import { Field } from '../shared-test-builder/BuilderFields';
import ImageField from '../shared-test-builder/ImageField';
import PartSummaryCard from '../writing/components/PartSummaryCard';
import { useListeningBuilder } from './context/ListeningBuilderContext';
import { LISTENING_PARTS } from './data/listeningTestModel';
import { saveStoredListeningTest } from './data/listeningTestStorage';
import { validateListeningTest } from './validation/listeningValidation';
import styles from '../writing/WritingTestDetailsPage.module.css';

export default function ListeningTestDetailsPage() {
  const { test, updateDetails, basePath } = useListeningBuilder();
  const navigate = useNavigate();
  const [errors, setErrors] = useState([]);
  const [confirm, setConfirm] = useState(false);
  const parts = LISTENING_PARTS.filter(part => test.mode === 'full' || test.mode === `part${part.number}`);

  const requestSave = () => {
    const next = validateListeningTest(test);
    setErrors(next);
    if (!next.length) setConfirm(true);
  };
  const persist = () => {
    try {
      const saved = saveStoredListeningTest(test);
      navigate(`/admin/tests/listening/${saved.id}/preview`, { state: { toast: test.id ? 'Listening test updated successfully.' : 'Listening test created successfully.' } });
    } catch {
      setErrors(['Unable to save. Uploaded audio may exceed this browser’s storage capacity; use hosted audio URLs for large files.']);
    } finally {
      setConfirm(false);
    }
  };
  return <div className={styles.page}>
    <AdminValidationToast errors={errors} onClose={() => setErrors([])} />
    <AdminConfirmDialog open={confirm} title={test.id ? 'Save changes to this Listening test?' : 'Create Listening test?'} message="The test will be saved and displayed in both Test Management and the Listening test list." confirmLabel={test.id ? 'Save changes' : 'Create test'} onCancel={() => setConfirm(false)} onConfirm={persist} />
    <AdminBreadcrumb current={test.details.title || 'New Listening test'} />
    <section className={styles.information}>
      <h2>INFORMATION TEST</h2>
      <div className={styles.infoGrid}>
        <div className={styles.fields}>
          <Field label="Title" value={test.details.title} onChange={value => updateDetails('title', value)} />
          <ImageField label="Test cover" value={test.details.pictureUrl} onChange={value => updateDetails('pictureUrl', value)} />
        </div>
        <aside><b>Preview</b><div><header><span>{test.mode === 'full' ? 'Full test' : test.mode.replace('part', 'Part ')}</span></header>{test.details.pictureUrl ? <img src={test.details.pictureUrl} alt="Test cover" /> : <strong>AptiMate<br /><em>Listening</em></strong>}<button onClick={requestSave}>Preview</button></div></aside>
      </div>
    </section>
    <section className={styles.content}>
      <h2>CONTENT TEST</h2>
      <div>{parts.map(part => <PartSummaryCard key={part.number} part={part} onEdit={() => navigate(`${basePath}/part/${part.number}`)} />)}</div>
      <button className={styles.saveAll} onClick={requestSave}>{test.id ? 'Update test & preview' : 'Save test & preview'}</button>
    </section>
  </div>;
}
