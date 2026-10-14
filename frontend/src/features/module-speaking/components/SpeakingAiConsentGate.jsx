import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../services/api.js';
import { normalizeApiError } from '../../../services/apiError.js';
import styles from './SpeakingAiConsentGate.module.css';

export default function SpeakingAiConsentGate({ children, requireWhenDisabled = false }) {
  const ui = useUiTranslation();
  const [params] = useSearchParams();
  const attemptId = params.get('attemptId');
  const [state, setState] = useState({ id: null, data: null, error: '' });
  const [adult, setAdult] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!attemptId) return undefined;
    const controller = new AbortController();
    api.get(`/speaking-grading/${attemptId}/consent`, { signal: controller.signal, notifyOnError: false })
      .then(response => setState({ id: attemptId, data: response.data, error: '' }))
      .catch(error => { if (!controller.signal.aborted) setState({ id: attemptId, data: null,
        error: normalizeApiError(error, ui("Unable to verify AI assessment consent.")).message }); });
    return () => controller.abort();
  }, [attemptId]);
  if (!attemptId) return children;
  if (state.id !== attemptId) return <section className={styles.panel}>{ui("Checking Speaking assessment settings…")}</section>;
  if (state.error) return <section className={styles.panel} role="alert">{ui.error(state.error)}<button onClick={() => window.location.reload()}>{ui("Retry")}</button></section>;
  if (state.data?.consent || !state.data?.enabled && !requireWhenDisabled) return <>
    {!state.data?.enabled && <p className={styles.disabled}>{ui("Speaking AI assessment is not enabled. Submitted recordings are saved without simulated scores.")}</p>}
    {children}
  </>;
  if (!state.data?.enabled) return <p className={styles.panel}>{ui("Speaking AI assessment is currently disabled.")}</p>;
  async function confirm() {
    setSaving(true);
    try {
      const response = await api.post(`/speaking-grading/${attemptId}/consent`, {
        confirmedAdult: adult, accepted, policyVersion: state.data.policyVersion,
      }, { notifyOnError: false });
      setState({ id: attemptId, data: response.data, error: '' });
    } catch (error) { setState(previous => ({ ...previous, error: normalizeApiError(error, ui("Unable to save consent.")).message })); }
    finally { setSaving(false); }
  }
  return <section className={styles.panel} aria-label={ui("Consent to Speaking AI assessment")}>
    <h2>{ui("Speaking AI assessment — ages 18 and over only")}</h2>
    <p>{ui("Audio, questions and task images will be sent to Groq for transcription and Google Gemini for assessment. Transcripts and feedback are saved with the result. CEFR is an AI estimate, not a certification result; scores out of 50 are for internal practice only. Do not include sensitive personal information in your answers.")}</p>
    <p>{ui("You can decline and return to the test list. For a timed exam, the timer starts when you open the test.")}</p>
    {state.data.billingTier === 'FREE' && <p>{ ui("Google Gemini uses the Free tier: Google may use audio, submitted content and results to improve its products; reviewers may inspect the data. Even fictional answers can identify you through your real voice. Do not send personal, sensitive or confidential information. This feature is for adults aged 18 and over and is unavailable on the Free tier in the EEA, Switzerland or the UK. When quota runs out, requests wait or fail; they do not automatically switch to paid services.") + ' ' }<a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">{ui("Gemini API terms")}</a></p>}
    <label><input type="checkbox" checked={adult} onChange={event => setAdult(event.target.checked)} />{ ' ' + ui("I confirm that I am at least 18 years old.") }</label>
    <label><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />{ ' ' + ui("I consent to sending audio to Groq and Google Gemini for assessment.") }</label>
    <button type="button" disabled={!adult || !accepted || saving} onClick={confirm}>{saving ? ui("Saving…") : ui("Agree and continue")}</button>
    <a href={params.get('practice') === 'true' ? '/speaking/practice' : '/speaking/tests'}>{ui("Decline — go back")}</a>
  </section>;
}
