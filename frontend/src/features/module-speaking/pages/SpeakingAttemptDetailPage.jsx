import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import ResultBackButton from '../../../components/common/ResultBackButton.jsx';
import { useMemo } from 'react';
import AssessmentProgress from '../../test-attempts/components/AssessmentProgress.jsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import RichTextContent from '../../../components/common/RichTextContent.jsx';
import AnswerSelect from '../../../components/common/AnswerSelect.jsx';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState.jsx';
import { useAttemptPartResult, useAttemptResult } from '../../test-attempts/hooks/useAttemptResult.js';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState.js';
import SpeakingAiConsentGate from '../components/SpeakingAiConsentGate.jsx';
import styles from './SpeakingAttemptDetailPage.module.css';
import { speakingResultParts } from '../utils/speakingResultParts.js';

const SCHEMA = { part: queryParam.positiveInt(1, 4) };
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
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const attemptId = params.get('attemptId');
  const isPractice = params.get('practice') === 'true';
  const [url, setUrl] = useUrlQueryState(SCHEMA);
  const summary = useAttemptResult(attemptId, 'SPEAKING');
  const parts = useMemo(() => speakingResultParts(summary.data), [summary.data]);
  const activePart = parts.includes(url.part) ? url.part : parts[0];
  const detail = useAttemptPartResult(attemptId, activePart, 'SPEAKING', summary.data?.assessmentRevision);
  if (summary.loading || (summary.error && !summary.data) || detail.loading || detail.error) {
    return <AttemptPageState loading={summary.loading || detail.loading} error={summary.error || detail.error}  backHref={isPractice ? '/speaking/practice' : '/speaking/tests'} />;
  }
  if (!detail.data) return <AttemptPageState error={ui("This response is not available.")}  backHref={isPractice ? '/speaking/practice' : '/speaking/tests'} />;
  const paper = detail.data.paper;
  const prompts = activePart === 4
    ? [{ key: paper.responseKey, text: paper.topic, prompts: paper.questions }]
    : paper.questions ?? [];
  const itemByKey = new Map((detail.data.items ?? []).map(item => [item.key, item]));
  return <div className={styles.page}><main>
    <ResultBackButton to={`/speaking/result?attemptId=${encodeURIComponent(attemptId)}${isPractice ? '&practice=true' : ''}`} />
    <header><div><span>{ui("SPEAKING RESULT")}</span><h1>{summary.data.title || ui("Submitted responses")}</h1></div>
      {parts.length > 1 && <AnswerSelect value={String(activePart)} onChange={event => setUrl({ part: Number(event.target.value) })}
        options={parts.map(part => ({ value: String(part), label: `Part ${part}` }))} ariaLabel={ui("Result part")} />}</header>
    {summary.data.result?.method === 'PENDING_AI' && <SpeakingAiConsentGate requireWhenDisabled><AssessmentProgress attemptId={attemptId} {...summary} /></SpeakingAiConsentGate>}
    <section className={styles.notice}><strong>{summary.data.result?.method === 'AI' ? ui("AI assessment · CEFR estimate") : ui("Assessment pending / legacy")}</strong>
      <p>{summary.data.result?.gradingNotice || ui("Your recordings are saved. No AI assessment is available yet.")}</p></section>
    <div className={styles.cards}>{prompts.map((prompt, index) => {
      const item = itemByKey.get(prompt.key);
      return <article key={prompt.key}><div className={styles.number}>{index + 1}</div><div>
        <RichTextContent value={prompt.text} />
        {prompt.prompts?.map((child, childIndex) => <RichTextContent key={childIndex} value={`${childIndex + 1}. ${child.text}`} />)}
        <p className={styles.recording}>{item?.selectedAnswer?.kind === 'AUDIO' ? ui("✓ Recording submitted") : ui("Skipped — no recording submitted")}</p>
        {item?.selectedAnswer?.kind === 'AUDIO' && <>
          <audio controls preload="none" src={item.selectedAnswer.mediaKey} aria-label={ui("Your recording for question {{value0}}", {value0:(index + 1)})} />
          <p><em>{ui("Transcript (English):")}</em></p>
          <p>{item?.assessment?.transcript || ui("No transcript is available, or the speech is unclear.")}</p>
          {item?.assessment && <div><strong className={styles.feedbackHeading}>{ui("Feedback")}</strong><p>{item.assessment.feedback}</p>
            <div className={styles.criterionGrid}>{CRITERIA.map(([key, label]) => {
              const feedback = item.assessment.details?.criterionFeedback?.[key];
              return <section key={key} className={styles.criterionCard}>
                <h3>{ui(label)} <span>{item.assessment.criteria[key]}%</span></h3>
                {feedback && <><p>{feedback.comment}</p>
                  <FeedbackList label={ui("Strengths")} items={feedback.strengths} />
                  <FeedbackList label={ui("Weaknesses")} items={feedback.weaknesses} />
                  <FeedbackList label={ui("Suggestions")} items={feedback.suggestions} /></>}
              </section>;
            })}</div>
            {item.assessment.details && <section className={styles.overallFeedback}>
              <FeedbackList label={ui("Overall strengths")} items={item.assessment.details.strengths} />
              <FeedbackList label={ui("Areas to improve")} items={item.assessment.details.weaknesses} />
              <FeedbackList label={ui("Next steps")} items={item.assessment.details.suggestions} />
            </section>}</div>}
        </>}
        {item?.sampleAnswer && <div className={styles.sample}><strong className={styles.feedbackHeading}>{ui("Sample answer")}</strong><RichTextContent value={item.sampleAnswer} /></div>}
        {!item?.sampleAnswer && item?.assessment?.details?.suggestedAnswer && <div className={styles.sample}>
          <strong className={styles.feedbackHeading}>{ui("AI suggested answer · Reference only")}</strong><p>{item.assessment.details.suggestedAnswer}</p></div>}
      </div></article>;
    })}</div>
    <button className={styles.back} onClick={() => navigate(isPractice ? '/speaking/practice' : '/speaking/tests')}>{ui("Take another")}</button>
  </main></div>;
}
