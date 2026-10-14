import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import AssessmentProgress from './AssessmentProgress.jsx';
import styles from './AttemptPageState.module.css';
import { useTestAttempt } from '../context/testAttemptContextStore';

export function AttemptPageState({ loading, error, backHref = '/grammar-vocab/tests' }) {
  const ui = useUiTranslation();
  if (!loading && !error) return null;
  if (loading && !error) return <main className={styles.state}><AssessmentProgress loading /></main>;
  return (
    <main className={styles.state} role={error ? 'alert' : 'status'}>
      <span className={loading ? styles.spinner : styles.errorIcon} aria-hidden="true">{error ? '!' : ''}</span>
      <h1>{error ? ui("Unable to open this test") : ui("Loading your test…")}</h1>
      {error && <p>{ui.error(error)}</p>}
      {error && <a href={backHref}>{ui("Back to test list")}</a>}
    </main>
  );
}

export function SaveIndicator({ status }) {
  const ui = useUiTranslation();
  const { resolveSaveConflict, retrySave } = useTestAttempt();
  const labels = { saving: 'Saving…', saved: 'Saved', practice: 'Saved after completion', unsaved: 'Not saved yet', error: 'Could not save', conflict: 'Open in another tab' };
  if (status === 'conflict') {
    return <div className={styles.conflictActions} role="alert">
      <span className={`${styles.save} ${styles.conflict}`}>{ui("Editing paused. Choose a version to continue.")}</span>
      <button type="button" onClick={() => resolveSaveConflict('server')}>{ui("Use server version")}</button>
      <button type="button" onClick={() => resolveSaveConflict('local')}>{ui("Keep all my answers")}</button>
    </div>;
  }
  if (status === 'error') return <div className={styles.conflictActions} role="alert">
    <span className={`${styles.save} ${styles.error}`}>{ui.error(labels.error)}</span>
    <button type="button" onClick={() => void retrySave()?.catch(() => undefined)}>{ui("Retry save")}</button>
  </div>;
  return <span className={`${styles.save} ${styles[status] ?? ''}`} role="status">{ui(labels[status] ?? labels.saved)}</span>;
}
