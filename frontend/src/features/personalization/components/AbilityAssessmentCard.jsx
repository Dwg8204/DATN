import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { practiceAttemptsApi } from '../../test-attempts/services/practiceAttemptsApi';
import styles from './Personalization.module.css';
const routes = {
  GRAMMAR_VOCAB: 'grammar-vocab',
  READING: 'reading',
  LISTENING: 'listening',
  WRITING: 'writing',
  SPEAKING: 'speaking',
};
export default function AbilityAssessmentCard({ profile, loadError = false }) {
  const { t } = useTranslation(),
    navigate = useNavigate();
  const [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
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
  if (!profile && !error && !loadError) return null;
  return (
    <section className={styles.card}>
      <h2>{t('personalization.placement.title')}</h2>
      <p>{t('personalization.placement.help')}</p>
      {(error || loadError) && (
        <p role="alert">{t('personalization.loadFailed')}</p>
      )}
      <ul className={styles.history}>
        {profile?.bySkill.map((s) => {
          const test = profile.placement.tests.find((x) => x.skill === s.skill),
            required = profile.placement.required.includes(s.skill),
            complete = s.assessmentComplete ?? s.status !== 'NONE';
          return (
            <li key={s.skill}>
              <strong>{t('personalization.ability.skills.' + s.skill)}</strong>{' '}
              ·{' '}
              {t(
                required
                  ? 'personalization.placement.required'
                  : 'personalization.placement.optional',
              )}{' '}
              · {s.band ?? t(complete ? 'personalization.placement.assessedWithoutBand' : 'personalization.ability.status.NONE')}
              {!complete &&
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
