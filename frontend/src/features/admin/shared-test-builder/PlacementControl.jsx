import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../services/api';
export function PlacementCoverage() {
  const { t } = useTranslation();
  const [missing, setMissing] = useState([]);
  useEffect(() => {
    let active = true;
    const load = () =>
      api
        .get('/admin/placement-tests', { notifyOnError: false })
        .then((r) => {
          if (active) setMissing(r.data.missing ?? []);
        })
        .catch(() => {});
    load();
    window.addEventListener('placement-changed', load);
    return () => {
      active = false;
      window.removeEventListener('placement-changed', load);
    };
  }, []);
  return missing.length ? (
    <p role="status">
      {t('personalization.placement.adminMissing', {
        skills: missing
          .map((s) => t('personalization.ability.skills.' + s))
          .join(', '),
      })}
    </p>
  ) : null;
}
export function PlacementControl({ test, onChange, onSaved }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const toggle = async (value) => {
    if (onChange) {
      onChange(value);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.put(
        '/admin/tests/' + test.id + '/placement',
        { isPlacement: value, version: test.version },
        { notifyOnError: false },
      );
      window.dispatchEvent(new Event('placement-changed'));
      onSaved?.();
    } catch {
      setError(t('personalization.placement.saveFailed'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 0',
        }}
      >
        <input
          type="checkbox"
          role="switch"
          style={{ accentColor: '#dc2626' }}
          checked={!!test.isPlacement}
          disabled={busy || test.mode !== 'full'}
          onChange={(e) => toggle(e.target.checked)}
        />
        {t('personalization.placement.adminLabel')}
      </label>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
