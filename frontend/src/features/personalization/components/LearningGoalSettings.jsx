import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import ConfirmModal from '../../../components/common/ConfirmModal';
import { personalizationApi as api } from '../services/personalizationApi';
import { LEGACY_GOAL_KEY, readLegacyGoal } from '../services/legacyGoal';
import styles from './Personalization.module.css';

export default function LearningGoalSettings() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const disableEmailRequested = searchParams.get('disableReminderEmail') === '1';
  const [state, setState] = useState(null);
  const [form, setForm] = useState({ targetCefr: 'B2', targetTests: 40, durationDays: 30 });
  const [preferences, setPreferences] = useState(null);
  const [history, setHistory] = useState({ items: [], page: 1, hasMore: false });
  const [legacy, setLegacy] = useState(() => readLegacyGoal(window.localStorage));
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (preferences && disableEmailRequested) document.getElementById('learning-preferences')?.scrollIntoView();
  }, [preferences, disableEmailRequested]);
  const load = async () => {
    const [current, settings, previous] = await Promise.all([api.goal(), api.preferences(), api.history(1)]);
    setState(current); setPreferences(settings); setHistory(previous);
    if (current.goal) setForm(({ targetCefr, targetTests, durationDays }) => ({ targetCefr: current.goal.targetCefr ?? targetCefr, targetTests: current.goal.targetTests ?? targetTests, durationDays: current.goal.durationDays ?? durationDays }));
  };
  useEffect(() => { let mounted = true; Promise.all([api.goal(), api.preferences(), api.history(1)]).then(([current, settings, previous]) => {
    if (!mounted) return;
    setState(current); setPreferences(settings); setHistory(previous);
    if (current.goal) setForm({ targetCefr: current.goal.targetCefr, targetTests: current.goal.targetTests, durationDays: current.goal.durationDays });
  }).catch(() => { if (mounted) setError(t('personalization.loadFailed')); }); return () => { mounted = false; }; }, [t]);

  const run = async action => {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await action(); setConfirmation(null); await load(); setMessage(t('personalization.saved')); }
    catch (err) { setError(t(err.response?.status === 409 ? 'personalization.conflict' : 'personalization.saveFailed')); }
    finally { setBusy(false); }
  };
  const goal = state?.goal;
  const saveGoal = event => {
    event.preventDefault();
    if (goal) setConfirmation({ kind: 'replace', action: () => api.replace({ ...form, goalId: goal.id }) });
    else void run(() => api.create(form));
  };
  const importGoal = () => setConfirmation({ kind: 'import', action: async () => {
    await api.create(legacy);
    window.localStorage.removeItem(LEGACY_GOAL_KEY);
    setLegacy(null);
  } });

  return <section className={styles.card} aria-busy={busy}>
    <h2>{t('personalization.title')}</h2>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {message && <p role="status">{message}</p>}
    {!state ? <button onClick={() => run(load)} disabled={busy}>{t('personalization.reload')}</button> : <>
      {goal && <p>{t('personalization.goalSummary', { ...goal })} <span className={styles.muted}>({goal.timezone})</span></p>}
      {!goal && legacy && <div><p>{t('personalization.legacy')}</p><button onClick={importGoal} disabled={busy}>{t('personalization.import')}</button></div>}
      <form onSubmit={saveGoal}>
        <div className={styles.fields}>
          <label className={styles.field}>{t('goal.targetBand')}<select value={form.targetCefr} onChange={e => setForm({ ...form, targetCefr: e.target.value })}>{['A1', 'A2', 'B1', 'B2', 'C'].map(band => <option key={band}>{band}</option>)}</select></label>
          <label className={styles.field}>{t('goal.totalTests')}<input type="number" required min="1" max="500" value={form.targetTests} onChange={e => setForm({ ...form, targetTests: Number(e.target.value) })} /></label>
          <label className={styles.field}>{t('personalization.days')}<input type="number" required min="3" max="180" value={form.durationDays} onChange={e => setForm({ ...form, durationDays: Number(e.target.value) })} /></label>
        </div>
        <div className={styles.actions}>
          <button disabled={busy} type="submit">{t(goal ? 'personalization.replace' : 'goal.save')}</button>
          {goal && <button type="button" disabled={busy} onClick={() => setConfirmation({ kind: 'cancel', action: () => api.cancel(goal.id) })}>{t('personalization.cancel')}</button>}
          {goal?.canFinish && <button type="button" disabled={busy} onClick={() => setConfirmation({ kind: 'finish', action: () => api.finish(goal.id) })}>{t('personalization.finish')}</button>}
        </div>
      </form>
      {preferences && <form id="learning-preferences" onSubmit={e => { e.preventDefault(); void run(() => api.savePreferences(preferences)); }}>
        <h3>{t('personalization.preferences')}</h3>
        <p className={styles.muted}>{t('personalization.reminderHelp')}</p>
        {disableEmailRequested && (preferences.emailReminderEnabled
          ? <button type="button" disabled={busy} onClick={() => run(() => api.savePreferences({ ...preferences, emailReminderEnabled: false }))}>{t('personalization.disableReminderEmail')}</button>
          : <p role="status">{t('personalization.reminderEmailDisabled')}</p>)}
        {['reminderEnabled', 'emailReminderEnabled', 'emailReportEnabled'].map(key => <label key={key} className={styles.check}><input type="checkbox" checked={preferences[key]} onChange={e => setPreferences({ ...preferences, [key]: e.target.checked })} />{t(`personalization.${key}`)}</label>)}
        <label className={styles.field}>{t('personalization.reminderTime')}<input type="time" required value={preferences.reminderTime} onChange={e => setPreferences({ ...preferences, reminderTime: e.target.value })} /></label>
        <div className={styles.actions}><button disabled={busy}>{t('personalization.savePreferences')}</button></div>
      </form>}
      <h3>{t('personalization.history')}</h3>
      {!history.items.length && <p>{t('personalization.noHistory')}</p>}
      <ul className={styles.history}>{history.items.map(item => <li key={item.id}>{t('personalization.goalSummary', item)} — {t(`personalization.lifecycle.${item.status}`)}</li>)}</ul>
      {history.hasMore && <button disabled={busy} onClick={async () => { setBusy(true); try { const next = await api.history(history.page + 1); setHistory({ ...next, items: [...history.items, ...next.items] }); } catch { setError(t('personalization.loadFailed')); } finally { setBusy(false); } }}>{t('personalization.more')}</button>}
    </>}
    {confirmation && <ConfirmModal title={t(`personalization.${confirmation.kind}`)} message={t(`personalization.confirm.${confirmation.kind}`)} busy={busy} confirmText={t('personalization.confirmAction')} cancelText={t('personalization.back')} onConfirm={() => run(confirmation.action)} onCancel={() => setConfirmation(null)} />}
  </section>;
}
