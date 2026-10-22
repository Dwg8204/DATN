import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { personalizationApi } from '../services/personalizationApi';
import { practiceAttemptsApi } from '../../test-attempts/services/practiceAttemptsApi';
import styles from './Personalization.module.css';
const routes = {
  GRAMMAR_VOCAB: 'grammar-vocab',
  READING: 'reading',
  LISTENING: 'listening',
  WRITING: 'writing',
  SPEAKING: 'speaking',
};
export default function AbilityAssessmentCard() {
  const { t } = useTranslation(),
    navigate = useNavigate();
  const [profile, setProfile] = useState(null),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    personalizationApi
      .ability()
      .then((p) => {
        if (active) setProfile(p);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const open = async (test) => {
    if (busy) return;
    const route = routes[test.skill];
    if (test.purpose === 'EXAM') {
      navigate(
        '/' +
          route +
          '/introduction?testId=' +
          encodeURIComponent(test.testId) +
          '&mode=full',
      );
      return;
    }
    setBusy(true);
    try {
      const attempt = await practiceAttemptsApi.start({
        testId: test.testId,
        attemptId: crypto.randomUUID(),
        mode: 'full',
      });
      navigate(
        '/' +
          route +
          '/test/part1?attemptId=' +
          attempt.attemptId +
          '&practice=true',
      );
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  if (profile?.placement.complete) return null;
  if (!profile && !error) return null;
  return (
    <section className={styles.card}>
      <h2>{t('personalization.placement.title')}</h2>
      <p>{t('personalization.placement.help')}</p>
      {error && <p role="alert">{t('personalization.loadFailed')}</p>}
      <ul className={styles.history}>
        {profile?.bySkill.map((s) => {
          const test = profile.placement.tests.find((x) => x.skill === s.skill),
            required = profile.placement.required.includes(s.skill);
          return (
            <li key={s.skill}>
              <strong>{t('personalization.ability.skills.' + s.skill)}</strong>{' '}
              ·{' '}
              {t(
                required
                  ? 'personalization.placement.required'
                  : 'personalization.placement.optional',
              )}{' '}
              · {s.band ?? t('personalization.ability.status.NONE')}
              {s.status === 'NONE' &&
                (test ? (
                  <button disabled={busy} onClick={() => open(test)}>
                    {t('personalization.placement.start', {
                      skill: t('personalization.ability.skills.' + s.skill),
                    })}
                  </button>
                ) : (
                  <span> · {t('personalization.placement.unavailable')}</span>
                ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
