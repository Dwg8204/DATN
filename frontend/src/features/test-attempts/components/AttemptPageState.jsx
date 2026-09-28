import styles from './AttemptPageState.module.css';
import { useTestAttempt } from '../context/testAttemptContextStore';

export function AttemptPageState({ loading, error, backHref = '/grammar-vocab/tests' }) {
  if (!loading && !error) return null;
  return (
    <main className={styles.state} role={error ? 'alert' : 'status'}>
      <span className={loading ? styles.spinner : styles.errorIcon} aria-hidden="true">{error ? '!' : ''}</span>
      <h1>{error ? 'Unable to open this test' : 'Loading your test…'}</h1>
      {error && <p>{error}</p>}
      {error && <a href={backHref}>Back to test list</a>}
    </main>
  );
}

export function SaveIndicator({ status }) {
  const { resolveSaveConflict, retrySave } = useTestAttempt();
  const labels = { saving: 'Saving…', saved: 'Saved', practice: 'Saved after completion', unsaved: 'Not saved yet', error: 'Could not save', conflict: 'Open in another tab' };
  if (status === 'conflict') {
    return <div className={styles.conflictActions} role="alert">
      <span className={`${styles.save} ${styles.conflict}`}>Editing paused. Choose a version to continue.</span>
      <button type="button" onClick={() => resolveSaveConflict('server')}>Use server version</button>
      <button type="button" onClick={() => resolveSaveConflict('local')}>Keep all my answers</button>
    </div>;
  }
  if (status === 'error') return <div className={styles.conflictActions} role="alert">
    <span className={`${styles.save} ${styles.error}`}>{labels.error}</span>
    <button type="button" onClick={() => void retrySave()?.catch(() => undefined)}>Retry save</button>
  </div>;
  return <span className={`${styles.save} ${styles[status] ?? ''}`} role="status">{labels[status] ?? labels.saved}</span>;
}
