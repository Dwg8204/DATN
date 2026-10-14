import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import styles from './BuilderDraftStatus.module.css';
import { useParams } from 'react-router-dom';
import { AdminConfirmDialog } from '../components/AdminFeedback';
import { useState } from 'react';

export default function BuilderDraftStatus({ builder, children }) {
  const ui = useUiTranslation();
  const { partNumber } = useParams();
  const { loading, error, draftStatus: status } = builder;
  const [leaving, setLeaving] = useState(false);
  const blocker = builder.exitGuard?.blocker;
  const leave = async () => {
    if (leaving || builder.exitGuard.isBusy()) return;
    setLeaving(true);
    try {
      await builder.flushDraft();
      blocker.proceed();
    } catch {
      // Keep the editor open when the final snapshot could not be saved.
      blocker.reset();
    } finally { setLeaving(false); }
  };
  if (loading) return <p role="status">{ui("Loading test draft…")}</p>;
  if (error) return <p role="alert">{ui.error(error)}</p>;
  return <>
    <AdminConfirmDialog open={blocker?.state === 'blocked'} title={ui("Leave test editor?")}
      message={builder.exitGuard?.isBusy() ? 'A server save is in progress. Wait for it to finish before leaving.'
        : status.error ? 'Your latest changes have not been saved on this device. Leaving may lose them. Retry the local save before leaving.'
          : 'This test has changes that have not been saved to the server. Your draft will be kept on this device so you can continue later. Leave the editor?'}
      confirmLabel={leaving ? ui("Saving draft…") : builder.exitGuard?.isBusy() ? ui("Saving to server…") : ui("Keep draft & leave")}
      onCancel={() => { if (!leaving) blocker.reset(); }} onConfirm={leave} />
    {(status.error || status.conflict) && <aside className={`${styles.status} ${partNumber ? styles.editorStatus : ''}`} aria-label={ui("Draft status")}>
      {status.error && <span role="alert">{ ui("Not saved on this device:") + ' ' }{ui.error(status.error)}</span>}
      {status.error && <button type="button" onClick={() => builder.flushDraft().catch(() => {})}>{ui("Retry local save")}</button>}
      {status.conflict && <div className={styles.conflict} role="alert">
        <p>{ui("This test has changed on the server. Choose which version to continue editing. Keeping your local version will replace the server content when you save.")}</p>
        <button type="button" onClick={() => status.resolveConflict(true)}>{ui("Keep local changes")}</button>
        <button type="button" onClick={() => status.resolveConflict(false)}>{ui("Use server version")}</button>
      </div>}
    </aside>}
    <div data-draft-saving={status.saving} data-draft-error={Boolean(status.error)} inert={status.conflict ? '' : undefined}>{children}</div>
  </>;
}
