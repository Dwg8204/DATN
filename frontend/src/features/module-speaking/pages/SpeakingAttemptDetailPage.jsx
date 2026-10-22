import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import ResultBackButton from '../../../components/common/ResultBackButton.jsx';
import { useMemo } from 'react';
import AssessmentProgress from '../../test-attempts/components/AssessmentProgress.jsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import RichTextContent from '../../../components/common/RichTextContent.jsx';
import { useTranslation } from 'react-i18next';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState.jsx';
import { useAttemptPartResult, useAttemptResult } from '../../test-attempts/hooks/useAttemptResult.js';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState.js';
import SpeakingAiConsentGate from '../components/SpeakingAiConsentGate.jsx';
import styles from './SpeakingAttemptDetailPage.module.css';
import feedbackStyles from '../../writing/components/assessment/WritingAssessment.module.css';
import { speakingResultParts } from '../utils/speakingResultParts.js';

const SCHEMA = { part: queryParam.positiveInt(1, 4), view: queryParam.enum(['student', 'ai', 'sample'], 'student') };
const CRITERIA = [
  ['grammarVocabulary', 'Grammar & Vocabulary'], ['pronunciation', 'Pronunciation'],
  ['fluency', 'Fluency'], ['taskFulfillment', 'Task Fulfillment'],
];

function FeedbackList({ label, items }) {
  if (!items?.length) return null;
  return <div><strong className={styles.feedbackHeading}>{label}</strong><ul>{items.map((text, index) => <li key={index}>{text}</li>)}</ul></div>;
}

export default function SpeakingAttemptDetailPage() {
  const ui = useUiTranslation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const attemptId = params.get('attemptId');
  const isPractice = params.get('practice') === 'true';
  const [url, setUrl] = useUrlQueryState(SCHEMA);
  const summary = useAttemptResult(attemptId, 'SPEAKING');
  const parts = useMemo(() => speakingResultParts(summary.data), [summary.data]);
  const activePart = parts.includes(url.part) ? url.part : parts[0];
  const detail = useAttemptPartResult(attemptId, activePart, 'SPEAKING', summary.data?.assessmentRevision);
  if (!summary.data && (summary.loading || summary.error)) {
    return <AttemptPageState loading={summary.loading} error={summary.error}  backHref={isPractice ? '/speaking/practice' : '/speaking/tests'} />;
  }
  if (!summary.data) return <AttemptPageState error={ui("This response is not available.")} backHref={isPractice ? '/speaking/practice' : '/speaking/tests'} />;
  const paper = detail.data?.paper;
  const partError = detail.error || (!detail.loading && !paper ? ui('This response is not available.') : '');
  const prompts = !paper ? [] : activePart === 4
    ? [{ key: paper.responseKey, text: paper.topic, prompts: paper.questions }]
    : paper.questions ?? [];
  const itemByKey = new Map((detail.data?.items ?? []).map(item => [item.key, item]));
  const speaking = summary.data.result?.speaking;
  const isFullSkill = summary.data.scope === 'FULL_SKILL';
  const partFeedback = speaking?.partFeedback?.find(part => part.partNumber === activePart);
  return <div className={styles.page}><main>
    <ResultBackButton to={`/speaking/result?attemptId=${encodeURIComponent(attemptId)}${isPractice ? '&practice=true' : ''}${params.get('model')==='groq'?'&model=groq':''}`} />
    <header className={styles.title}><div><span>Speaking Part {activePart}</span><h1>{summary.data.title || ui("Submitted responses")}</h1></div></header>
    {parts.length > 1 && <nav className={styles.partTabs} aria-label={ui("Speaking parts")}>
      {parts.map(part => <button type="button" key={part} className={part === activePart ? styles.active : ''}
        aria-current={part === activePart ? 'page' : undefined} onClick={() => setUrl({ part })}>{ui("Part")} {part}</button>)}
    </nav>}
    {summary.data.result?.method === 'PENDING_AI' && <SpeakingAiConsentGate requireWhenDisabled><AssessmentProgress attemptId={attemptId} {...summary} /></SpeakingAiConsentGate>}
    <section className={styles.notice}><strong>{!isFullSkill ? t('speakingDetailedFeedback.partAssessment') : summary.data.result?.method === 'AI' ? ui("AI assessment · CEFR estimate") : ui("Assessment pending / legacy")}</strong>
      <p>{!isFullSkill ? t('speakingDetailedFeedback.partCefrNotice') : summary.data.result?.gradingNotice || ui("Your recordings are saved. No AI assessment is available yet.")}</p></section>
    {!isFullSkill && speaking?.provider === 'RANDOM' && <p>{ui("Legacy simulated result; the audio has not been analyzed by AI.")}</p>}
    {isFullSkill && <section className={feedbackStyles.panel} aria-label={t('speakingDetailedFeedback.cefr')}>
      <h2>{t('speakingDetailedFeedback.cefr')}</h2>
      <strong className={feedbackStyles.level}>{speaking?.provider === 'LLM' ? speaking.estimatedCefr || '—' : '—'}</strong>
      {speaking?.cefrReason ? <p>{speaking.cefrReason}</p> : <p>{t('speakingDetailedFeedback.noCefr')}</p>}
      <small className={feedbackStyles.muted}>{t('writingAi.estimated')}</small>
    </section>}
    <nav className={styles.viewTabs} aria-label={ui("Result view")}>
      {['student', 'ai', 'sample'].map(view => <button type="button" key={view}
        className={url.view === view ? styles.active : ''} aria-pressed={url.view === view}
        onClick={() => setUrl({ view })}>{t(`writingAi.${view}`)}</button>)}
    </nav>
    {partError && <p role="alert">{ui.error(partError)}</p>}
    <div className={styles.detailLayout}>
    <div className={styles.cards} aria-busy={detail.loading} key={`${activePart}:${url.view}`}>{prompts.map((prompt, index) => {
      const item = itemByKey.get(prompt.key);
      return <article key={prompt.key}><div className={styles.number}>{index + 1}</div><div>
        <RichTextContent value={prompt.text} />
        {prompt.prompts?.map((child, childIndex) => <RichTextContent key={childIndex} value={`${childIndex + 1}. ${child.text}`} />)}
        {url.view === 'student' && <>
        <p className={styles.recording}>{item?.selectedAnswer?.kind === 'AUDIO' ? ui("✓ Recording submitted") : ui("Skipped — no recording submitted")}</p>
        {item?.selectedAnswer?.kind === 'AUDIO' && <>
          <audio controls preload="none" src={item.selectedAnswer.mediaKey} aria-label={ui("Your recording for question {{value0}}", {value0:(index + 1)})} />
          <p><em>{ui("Transcript (English):")}</em></p>
          <p>{item?.assessment?.transcript || ui("No transcript is available, or the speech is unclear.")}</p>
          {item?.assessment && <details className={`${feedbackStyles.panel} ${feedbackStyles.questionFeedback} ${styles.aiFeedback}`}>
            <summary className={feedbackStyles.feedbackToggle}>
              <h3>{t('writingAi.questionFeedback')}</h3>
              <span className={feedbackStyles.expandIcon} aria-hidden="true">+</span>
              <span className={feedbackStyles.collapseIcon} aria-hidden="true">−</span>
            </summary>
            <div className={feedbackStyles.feedbackBody}><p>{item.assessment.feedback}</p>
            <div className={feedbackStyles.criteria}>{CRITERIA.map(([key, label]) => {
              const feedback = item.assessment.details?.criterionFeedback?.[key];
              return <details key={key} className={styles.criterionFeedback}>
                <summary>{ui(label)} · <span className={styles.score}>{item.assessment.criteria?.[key]==null?'—':`${item.assessment.criteria[key]}%`}</span></summary>
                {feedback && <><p>{feedback.comment}</p>
                  <FeedbackList label={ui("Strengths")} items={feedback.strengths} />
                  <FeedbackList label={ui("Weaknesses")} items={feedback.weaknesses} />
                  <FeedbackList label={ui("Suggestions")} items={feedback.suggestions} /></>}
                {!feedback && <p>{t('writingAi.pendingFeedback')}</p>}
              </details>;
            })}</div>
            {item.assessment.details && <section className={styles.overallFeedback}>
              <FeedbackList label={ui("Overall strengths")} items={item.assessment.details.strengths} />
              <FeedbackList label={ui("Areas to improve")} items={item.assessment.details.weaknesses} />
              <FeedbackList label={ui("Next steps")} items={item.assessment.details.suggestions} />
            </section>}</div></details>}
        </>}
        </>}
        {url.view === 'ai' && <div className={styles.sample}>
          <p>{item?.assessment?.details?.suggestedAnswer || t('writingAi.noRevision')}</p>
        </div>}
        {url.view === 'sample' && <div className={styles.sample}>
          {item?.sampleAnswer ? <RichTextContent value={item.sampleAnswer} /> : <p>{t('writingAi.noSample')}</p>}
        </div>}
      </div></article>;
    })}</div>
    <aside className={styles.partFeedback}>
      <section className={feedbackStyles.panel}>
        <h2>{t('writingAi.partFeedback')} · Part {activePart}</h2>
        {partFeedback ? <>
          <p>{partFeedback.overview}</p>
          <FeedbackList label={ui('Strengths')} items={partFeedback.strengths} />
          <FeedbackList label={ui('Areas to improve')} items={partFeedback.weaknesses} />
          <FeedbackList label={ui('Suggestions')} items={partFeedback.suggestions} />
        </> : <p>{t('speakingDetailedFeedback.noPartFeedback')}</p>}
      </section>
      <small>{t('speakingDetailedFeedback.savedRecording')}</small>
    </aside>
    </div>
    <button className={styles.back} onClick={() => navigate(isPractice ? '/speaking/practice' : '/speaking/tests')}>{ui("Take another")}</button>
  </main></div>;
}
