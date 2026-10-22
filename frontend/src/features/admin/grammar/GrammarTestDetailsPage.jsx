import {PlacementControl,PlacementCoverage} from '../shared-test-builder/PlacementControl';
import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
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
import { grammarMediaApi } from './services/grammarTestsApi';
import { getApiError } from '../../../services/apiError';

const PARTS = [
  { number: 1, title: 'Grammar', summary: '25 multiple-choice questions.' },
  { number: 2, title: 'Vocabulary', summary: '5 sets of word-matching questions.' },
];

export default function GrammarTestDetailsPage() {
  const ui = useUiTranslation();
  const navigate = useNavigate();
  const { test, setTest, updateDetails, goTo, saveDraft, publishTest } = useGrammarTestBuilder();
  const { showError, showSuccess, dismissToast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const visible = test.mode === 'full' ? PARTS : PARTS.filter(part => `part${part.number}` === test.mode);
  const saveInformation = async () => {
    const message = getFirstValidationError(validateGrammarDetails(test.details));
    if (message) return showError(message);
    if (busy) return;
    setBusy(true);
    try {
      await saveDraft();
      showSuccess(ui("Test information saved as a draft."));
      await goTo();
    } catch (error) {
      showError(getApiError(error, ui("Unable to save the test draft.")));
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
    try {
      const saved = await publishTest();
      showSuccess(test.id ? ui("Grammar & Vocabulary test updated successfully.") : ui("Grammar & Vocabulary test created successfully."));
      navigate(`/admin/tests/grammar/${saved.id}/preview`, { state: { toast: 'Test published successfully.' } });
    } catch (error) {
      showError(getApiError(error, ui("Unable to save or publish the test. Your draft is preserved.")));
    }
    finally { setBusy(false); }
  };

  return <div className={styles.page}>
    <AdminConfirmDialog open={confirm} title={test.id ? ui("Save changes to this test?") : ui("Create this test?")} message={test.id ? 'Your changes will replace the saved Grammar & Vocabulary test.' : 'The test will be saved and displayed in the Grammar & Vocabulary test list.'} confirmLabel={test.id ? ui("Save changes") : ui("Create test")} onCancel={() => setConfirm(false)} onConfirm={persist} />
    <AdminBreadcrumb current={test.details.title || 'New test'} purpose={test.purpose} />
    <section className={styles.information} inert={busy ? '' : undefined} aria-busy={busy}>
      <h2>{ui("INFORMATION TEST")}</h2>
      <div className={styles.infoGrid}>
        <div className={styles.fields}>
          <label><b>{ui("Title:")}</b><input value={test.details.title} onChange={event => updateDetails('title', event.target.value)} /></label>
          <PlacementCoverage /><PlacementControl test={test} onChange={value=>setTest(current=>({...current,isPlacement:value}))} />
          <ImageField label={ui("Test cover")} value={test.details.pictureUrl} uploadFile={grammarMediaApi.uploadCover} onChange={value => updateDetails('pictureUrl', value)} />
          <button className={styles.saveInfo} disabled={busy} onClick={saveInformation}>{busy ? ui("Saving…") : ui("Save draft")}</button>
        </div>
        <aside><b>{ui("Preview")}</b><div><header><span>{test.mode === 'full' ? ui("Full test") : test.mode.replace('part', 'Part ')}</span><small>{test.status === 'PUBLISHED' ? ui("Published") : ui("Draft")}</small></header>{test.details.pictureUrl ? <img src={test.details.pictureUrl} alt={ui("Test preview")} /> : <strong>AptiMate<br /><em>{ui("Grammar")}</em></strong>}<button disabled={busy} onClick={requestSave}>{test.status === 'PUBLISHED' ? ui("Update & preview") : ui("Publish & preview")}</button></div></aside>
      </div>
    </section>
    <section className={styles.content} inert={busy ? '' : undefined}><h2>{ui("CONTENT TEST")}</h2><div>{visible.map(part => <PartSummaryCard key={part.number} part={part} onEdit={() => goTo(part.number)} />)}</div><button className={styles.saveAll} disabled={busy} onClick={requestSave}>{busy ? ui("Saving…") : test.status === 'PUBLISHED' ? ui("Update & publish test") : ui("Publish test & preview")}</button></section>
  </div>;
}
