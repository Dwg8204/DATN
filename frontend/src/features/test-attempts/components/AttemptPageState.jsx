import styles from './AttemptPageState.module.css';

export function AttemptPageState({ loading, error }) {
  if (!loading && !error) return null;
  return (
    <main className={styles.state} role={error ? 'alert' : 'status'}>
      <span className={loading ? styles.spinner : styles.errorIcon} aria-hidden="true">{error ? '!' : ''}</span>
      <h1>{error ? 'Unable to open this test' : 'Loading your test…'}</h1>
      {error && <p>{error}</p>}
      {error && <a href="/grammar-vocab/tests">Back to test list</a>}
    </main>
  );
}

export function SaveIndicator({ status }) {
  const labels = { saving: 'Saving…', saved: 'Saved', unsaved: 'Not saved yet', conflict: 'Open in another tab' };
  return <span className={`${styles.save} ${styles[status] ?? ''}`} role="status">{labels[status] ?? labels.saved}</span>;
}
