import PageLoader from '../../../components/common/PageLoader.jsx';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProfileSidebar from '../../profile/components/ProfileSidebar';
import RichTextContent from '../../../components/common/RichTextContent';
import AnswerExplanation from '../../../components/common/AnswerExplanation';
import { personalizationApi } from '../services/personalizationApi';
import { mistakeSections } from '../services/mistakePresentation';
import layout from '../../profile/pages/ProfilePage.module.css';
import styles from './Personalization.module.css';
import { useToast } from '../../../context/ToastContext';

export default function MistakeReviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [params, setParams] = useSearchParams();
  const itemId = params.get('itemId');
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (itemId)
      personalizationApi
        .mistakes(itemId)
        .then((value) => {
          if (active) {
            setData(value);
            setError(false);
          }
        })
        .catch(() => {
          if (active) setError(true);
        });
    return () => {
      active = false;
    };
  }, [itemId]);
  const current = data?.itemId === itemId ? data : null;
  const finish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await personalizationApi.markReviewed(itemId);
      showSuccess(t('personalization.reviewSaved'));
      navigate('/profile/dashboard');
    } catch {
      setError(true);
      showError(t('personalization.reviewFailed'));
    } finally {
      setBusy(false);
    }
  };
  const ask = (key) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('attemptId', current.attemptId);
      next.set('questionKey', key);
      next.set('chat', '1');
      return next;
    });
  return (
    <div className={layout.page}>
      <div className={layout.container}>
        <ProfileSidebar activeTab="mistakes" />
        <main className={layout.content}>
          <section className={styles.card}>
            <h1>{t('personalization.mistakesTitle')}</h1>
            <Link to="/profile/dashboard">{t('personalization.backPlan')}</Link>
            {error && (
              <p role="alert" className={styles.error}>
                {t('personalization.reviewFailed')}
              </p>
            )}
            {!itemId && <p>{t('personalization.chooseReview')}</p>}
            {itemId && !current && !error && (
              <PageLoader />
            )}
            {current?.details.map((detail) => (
              <section key={detail.partNumber}>
                <h2>
                  {t(`personalization.skills.${current.component}`)} · Part{' '}
                  {detail.partNumber}
                </h2>
                {mistakeSections(detail).map((section) => (
                  <section key={section.id}>
                    {section.context && (
                      <div className={styles.context}>
                        <RichTextContent value={section.context} />
                      </div>
                    )}
                    {section.audioUrl && (
                      <audio controls preload="none" src={section.audioUrl} />
                    )}
                    {section.rows.map((row) => (
                      <article className={styles.question} key={row.key}>
                        <h3>{row.key}</h3>
                        <RichTextContent value={row.prompt} />
                        {row.audioUrl && (
                          <audio controls preload="none" src={row.audioUrl} />
                        )}
                        <p>{t('personalization.yourAnswer')}</p>
                        <RichTextContent
                          value={row.selected ?? t('personalization.noAnswer')}
                        />
                        <p>{t('personalization.correctAnswer')}</p>
                        <RichTextContent
                          value={
                            row.correct ??
                            t('personalization.answerUnavailable')
                          }
                        />
                        <AnswerExplanation
                          open
                          text={
                            row.outcome.explanation ||
                            t('personalization.noExplanation')
                          }
                        />
                        <button onClick={() => ask(row.key)}>
                          {t('personalization.ask')}
                        </button>
                      </article>
                    ))}
                  </section>
                ))}
              </section>
            ))}
            {current && (
              <div className={styles.actions}>
                <button
                  disabled={busy || current.done || !current.canMarkDone}
                  onClick={finish}
                >
                  {t(
                    current.done
                      ? 'personalization.reviewed'
                      : 'personalization.markReviewed',
                  )}
                </button>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
