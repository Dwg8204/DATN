import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminConfirmDialog } from '../components/AdminFeedback';
import AdminBreadcrumb from '../components/AdminBreadcrumb';
import ImageField from '../shared-test-builder/ImageField';
import PartSummaryCard from '../writing/components/PartSummaryCard';
import { useGrammarTestBuilder } from './context/GrammarTestBuilderContext';
import { validateGrammarDetails, validateGrammarTest } from './data/grammarTestValidation';
import { useToast } from '../../../context/ToastContext';
import { getFirstValidationError } from '../../../utils/validationErrors';
import styles from '../writing/WritingTestDetailsPage.module.css';
import { grammarMediaApi, grammarTestsApi } from './services/grammarTestsApi';
import { getApiError } from '../../../services/apiError';

const PARTS = [
  { number: 1, title: 'Grammar', summary: '25 multiple-choice questions.' },
  { number: 2, title: 'Vocabulary', summary: '5 sets of word-matching questions.' },
];

export default function GrammarTestDetailsPage() {
  const navigate = useNavigate();
  const { test, updateDetails, replaceTest, basePath } = useGrammarTestBuilder();
  const { showError, showSuccess, dismissToast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const visible = test.mode === 'full' ? PARTS : PARTS.filter(part => `part${part.number}` === test.mode);
  const saveDraft = async () => test.id ? grammarTestsApi.update(test) : grammarTestsApi.create(test);
  const saveInformation = async () => {
    const message = getFirstValidationError(validateGrammarDetails(test.details));
    if (message) return showError(message);
    if (busy) return;
    setBusy(true);
    try {
      const saved = await saveDraft();
      replaceTest(saved);
      showSuccess('Test information saved as a draft.');
      if (!test.id) navigate(`/admin/tests/grammar/${saved.id}/edit`, { replace: true });
    } catch (error) {
      showError(getApiError(error, 'Unable to save the test draft.'));
    } finally { setBusy(false); }
  };
  const requestSave = () => {
    if (busy) return;
    const message = getFirstValidationError(validateGrammarTest(test));
    if (message) return showError(message);
    dismissToast();
    setConfirm(true);
  };
  const persist = async () => {
    setConfirm(false);
    if (busy) return;
    setBusy(true);
    let draft;
    try {
      draft = await saveDraft();
      replaceTest(draft);
      const saved = await grammarTestsApi.publish(draft.id);
      showSuccess(test.id ? 'Grammar & Vocabulary test updated successfully.' : 'Grammar & Vocabulary test created successfully.');
      navigate(`/admin/tests/grammar/${saved.id}/preview`, { state: { toast: 'Test published successfully.' } });
    } catch (error) {
      showError(getApiError(error, draft ? 'Draft saved, but publishing failed. You can retry without creating another test.' : 'Unable to save the test.'));
      if (draft && !test.id) navigate(`/admin/tests/grammar/${draft.id}/edit`, { replace: true });
    }
    finally { setBusy(false); }
  };

  return <div className={styles.page}>
    <AdminConfirmDialog open={confirm} title={test.id ? 'Save changes to this test?' : 'Create this test?'} message={test.id ? 'Your changes will replace the saved Grammar & Vocabulary test.' : 'The test will be saved and displayed in the Grammar & Vocabulary test list.'} confirmLabel={test.id ? 'Save changes' : 'Create test'} onCancel={() => setConfirm(false)} onConfirm={persist} />
    <AdminBreadcrumb current={test.details.title || 'New test'} />
    <section className={styles.information} inert={busy ? '' : undefined} aria-busy={busy}>
      <h2>INFORMATION TEST</h2>
      <div className={styles.infoGrid}>
        <div className={styles.fields}>
          <label><b>Title:</b><input value={test.details.title} onChange={event => updateDetails('title', event.target.value)} /></label>
          <ImageField label="Test cover" value={test.details.pictureUrl} uploadFile={grammarMediaApi.uploadCover} onChange={value => updateDetails('pictureUrl', value)} />
          <button className={styles.saveInfo} disabled={busy} onClick={saveInformation}>{busy ? 'Saving…' : 'Save draft'}</button>
        </div>
        <aside><b>Preview</b><div><header><span>{test.mode === 'full' ? 'Full test' : test.mode.replace('part', 'Part ')}</span><small>{test.status === 'PUBLISHED' ? 'Published' : 'Draft'}</small></header>{test.details.pictureUrl ? <img src={test.details.pictureUrl} alt="Test preview" /> : <strong>AptiMate<br /><em>Grammar</em></strong>}<button disabled={busy} onClick={requestSave}>{test.status === 'PUBLISHED' ? 'Update & preview' : 'Publish & preview'}</button></div></aside>
      </div>
    </section>
    <section className={styles.content} inert={busy ? '' : undefined}><h2>CONTENT TEST</h2><div>{visible.map(part => <PartSummaryCard key={part.number} part={part} onEdit={() => navigate(`${basePath}/part/${part.number}${test.id ? '' : `?mode=${test.mode}`}`)} />)}</div><button className={styles.saveAll} disabled={busy} onClick={requestSave}>{busy ? 'Saving…' : test.status === 'PUBLISHED' ? 'Update & publish test' : 'Publish test & preview'}</button></section>
  </div>;
}
