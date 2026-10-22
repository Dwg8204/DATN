import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ConfirmModal from '../../../components/common/ConfirmModal';
import { personalizationApi as api } from '../services/personalizationApi';
import styles from './Personalization.module.css';

export default function FinalGoalSuggestion({ suggestion }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(suggestion);
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const pending = useRef(false);
  const run = async action => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { await action(); }
    catch (err) { setError(t(err.response?.data?.error?.code === 'GOAL_PACE_TOO_HIGH' ? 'personalization.paceTooHigh' : err.response?.status === 409 ? 'personalization.conflict' : 'personalization.saveFailed')); setConfirmation(null); }
    finally { pending.current = false; setBusy(false); }
  };
  const prepare = event => {
    event.preventDefault();
    if(form.targetTests > 3 * form.durationDays){setError(t('personalization.paceTooHigh'));return;}
    void run(async () => {
      const { goal } = await api.goal();
      setConfirmation({ goalId: goal?.id ?? null, form: { ...form } });
    });
  };
  const apply = () => run(async () => {
    if (confirmation.goalId) await api.replace({ ...confirmation.form, goalId: confirmation.goalId });
    else await api.create(confirmation.form);
    setSaved(true); setConfirmation(null);
  });
  if (saved) return <p role="status">{t('personalization.suggestionSaved')} <Link to="/profile/dashboard">{t('personalization.reportOpenPlan')}</Link></p>;
  return <section>
    <h3>{t('personalization.nextGoal')}</h3>
    <p>{t('personalization.suggestionHelp')}</p>
    {error && <p role="alert">{error}</p>}
    <form onSubmit={prepare}>
      <div className={styles.fields}>
        <label className={styles.field}>{t('goal.targetBand')}<select value={form.targetCefr} disabled={busy} onChange={e => setForm({ ...form, targetCefr: e.target.value })}>{['A1', 'A2', 'B1', 'B2', 'C'].map(b => <option key={b}>{b}</option>)}</select></label>
        <label className={styles.field}>{t('goal.totalTests')}<input type="number" required min="1" max="500" disabled={busy} value={form.targetTests} onChange={e => setForm({ ...form, targetTests: Number(e.target.value) })} /></label>
        <label className={styles.field}>{t('personalization.days')}<input type="number" required min="3" max="180" disabled={busy} value={form.durationDays} onChange={e => setForm({ ...form, durationDays: Number(e.target.value) })} /></label>
      </div>
      <button disabled={busy}>{t('personalization.applySuggestion')}</button>
    </form>
    {confirmation && <ConfirmModal title={t('personalization.applySuggestion')}
      message={t(confirmation.goalId ? 'personalization.confirm.replace' : 'personalization.confirmSuggestion')}
      busy={busy} confirmText={t('personalization.confirmAction')} cancelText={t('personalization.back')}
      onConfirm={apply} onCancel={() => { if (!busy) setConfirmation(null); }} />}
  </section>;
}
