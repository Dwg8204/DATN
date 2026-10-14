import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
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
          {item?.assessment && <div><strong>{ui("Feedback")}</strong><p>{item.assessment.feedback}</p>
            {Object.entries(item.assessment.criteria).map(([key, score]) => <p key={key}>{key}: {score}%</p>)}</div>}
        </>}
        {item?.sampleAnswer && <div className={styles.sample}><strong>{ui("Sample answer")}</strong><RichTextContent value={item.sampleAnswer} /></div>}
      </div></article>;
    })}</div>
    <button className={styles.back} onClick={() => navigate(isPractice ? '/speaking/practice' : '/speaking/tests')}>{ui("Take another")}</button>
  </main></div>;
}
