import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import ResultBackButton from '../../../components/common/ResultBackButton.jsx';
import AssessmentProgress from '../../test-attempts/components/AssessmentProgress.jsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import RichTextContent from '../../../components/common/RichTextContent.jsx';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState.jsx';
import { useAttemptPartResult, useAttemptResult } from '../../test-attempts/hooks/useAttemptResult.js';
import SpeakingAiConsentGate from '../components/SpeakingAiConsentGate.jsx';
import { speakingResultParts, speakingPartStatus } from '../utils/speakingResultParts.js';
import styles from './SpeakingResultPage.module.css';
import extra from './SpeakingAttemptResultPage.module.css';

const CRITERIA = [
  { key: 'grammarVocabulary', label: 'Grammar & Vocabulary' },
  { key: 'pronunciation', label: 'Pronunciation' },
  { key: 'fluency', label: 'Fluency' },
  { key: 'taskFulfillment', label: 'Task Fulfillment' },
];

function getStatColor(value) {
  if (value >= 75) return '#43B75D';
  if (value >= 40) return '#F5A623';
  return '#DA1E21';
}

function PartContent({ attemptId, partNumber, attempt, isPractice }) {
  const ui = useUiTranslation();
  const { data, loading, error } = useAttemptPartResult(attemptId, partNumber, 'SPEAKING', attempt.assessmentRevision);
  if (loading || (error && !data)) return <AttemptPageState loading={loading} error={error}  backHref={isPractice ? '/speaking/practice' : '/speaking/tests'} />;
  if (!data) return <AttemptPageState error={ui("Part {{value0}} is unavailable.", {value0:(partNumber)})}  backHref={isPractice ? '/speaking/practice' : '/speaking/tests'} />;

  const paper = data.paper;
  const questions = partNumber === 4
    ? [{ key: paper.responseKey, text: paper.topic, prompts: paper.questions }]
    : paper.questions ?? [];
  const answers = new Map((data.items ?? []).map(item => [item.key, item.selectedAnswer]));
  const outcomes = new Map((data.items ?? []).map(item => [item.key, item]));
  const status = speakingPartStatus(attempt, partNumber);

  return <div className={styles.mainBody}>
    <section className={styles.transcriptCol} aria-label={ui("Part {{value0}} responses", {value0:(partNumber)})}>
      <span className={styles.transcriptBadge}>{ ui("Part") + ' ' }{partNumber}</span>
      <div className={styles.qnaScrollArea}>{questions.map((question, index) => {
        const answer = answers.get(question.key);
        const hasAudio = answer?.kind === 'AUDIO' && Boolean(answer.mediaKey);
        return <div className={styles.qnaPair} key={question.key}>
          <div className={styles.examinerText}>
            <strong>{partNumber === 4 ? ui("Examiner:") : ui("Examiner: Q{{value0}}:", {value0:(index + 1)})}</strong>
            <RichTextContent value={question.text} />
            {question.prompts?.map((prompt, promptIndex) =>
              <RichTextContent key={promptIndex} value={`${promptIndex + 1}. ${prompt.text}`} />)}
          </div>
          <div className={styles.candidateText}>
            <strong>{ui("Candidate:")}</strong> {hasAudio ? ui("Recording submitted") : ui("Skipped — no recording submitted")}
            {hasAudio && <>
              <audio className={extra.audio} controls preload="none" src={answer.mediaKey}
                aria-label={ui("Your recording for Part {{value0}}, question {{value1}}", {value0:(partNumber),value1:(index + 1)})} />
              <p className={extra.mockNotice}>{ui("Transcript (English):")}</p>
              <p>{outcomes.get(question.key)?.assessment?.transcript || ui("No transcript is available; processing is pending or the speech is unclear.")}</p>
            </>}
          </div>
        </div>;
      })}</div>
    </section>
    <aside className={styles.feedbackCol} aria-label={ui("Part {{value0}} feedback", {value0:(partNumber)})}>
      <div className={styles.feedbackCard}><div className={styles.feedbackText}>
        <strong>{ ui("Part") + ' ' }{partNumber}: {status.recorded}{' '}{ ui("recorded,") + ' ' }{Math.max(status.skipped, questions.length - status.recorded)}{ ' ' + ui("Skipped") }</strong>
      </div></div>
      {status.recorded > 0 ? <>
        <div className={styles.feedbackCard}><div className={styles.feedbackText}>
          {attempt.result?.gradingNotice || ui("The recording is awaiting AI assessment; no assessment feedback is available yet.")}
        </div></div>
        {(data.items ?? []).filter(item => item.assessment).map((item, index) => <div key={item.key} className={styles.feedbackCard}>
          <div className={styles.feedbackText}><strong>{ ui("Response") + ' ' }{index + 1}</strong><p>{item.assessment.feedback}</p>
            {CRITERIA.map(({ key, label }) => <p key={key}>{ui(label)}: {item.assessment.criteria[key]}%</p>)}
            {item.assessment.qualityFlags?.length > 0 && <p>{item.assessment.qualityFlags.join(' · ')}</p>}
          </div></div>)}
      </> : <div className={styles.feedbackCard}><div className={styles.feedbackText}>{ui("Skipped — there is no recording to review.")}</div></div>}
    </aside>
  </div>;
}

export default function SpeakingAttemptResultPage() {
  const ui = useUiTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const attemptId = params.get('attemptId');
  const isPractice = params.get('practice') === 'true';
  const { data, loading, error, paused, refresh } = useAttemptResult(attemptId, 'SPEAKING');
  if (loading || (error && !data)) return <AttemptPageState loading={loading} error={error}
    backHref={isPractice ? '/speaking/practice' : '/speaking/tests'} />;
  if (!data?.result) return <AttemptPageState error={ui("This Speaking result is not available.")}  backHref={isPractice ? '/speaking/practice' : '/speaking/tests'} />;

  const parts = speakingResultParts(data);
  const requestedPart = Number(params.get('part'));
  const activePart = parts.includes(requestedPart) ? requestedPart : parts[0];
  const assessment = data.result.speaking;
  const setActivePart = partNumber => setParams(previous => {
    const next = new URLSearchParams(previous);
    next.set('part', String(partNumber));
    return next;
  });

  return <div className={styles.page}><div className={styles.contentWrap}>
    {data.result.method !== 'PENDING_AI' && <AssessmentProgress attemptId={attemptId} data={data} error={error} refresh={refresh} />}
    <div className={styles.topSection}>
      <section className={styles.cefrBox}>
        <h1 className={styles.cefrLabel}>{assessment?.provider === 'RANDOM' ? ui("CEFR · Simulated") : ui("CEFR · AI estimate")}</h1>
        <strong className={styles.cefrValue}>{assessment ? data.estimatedCefr || '—' : '—'}</strong>
        <span className={extra.totalScore}>{assessment && data.score != null ? ui("{{value0}} / 50 · Practice score", {value0:(Number(data.score).toFixed(2))}) : ui("Not assessed")}</span>
      </section>
      <section className={styles.reportBox}>
        <h2 className={styles.reportTitle}>{ui("Report")}</h2>
        <p className={styles.reportSub}>{assessment?.provider === 'RANDOM' ? ui("Legacy simulated result; the audio has not been analyzed by AI.") : data.result.gradingNotice || ui("Your test is awaiting AI assessment. If the wait is long, refresh the page or contact an administrator.")}</p>
        {assessment?.cefrReason && <p className={styles.reportSub}>{assessment.cefrReason}</p>}
        {data.result.method === 'PENDING_AI' && <SpeakingAiConsentGate requireWhenDisabled><AssessmentProgress attemptId={attemptId} data={data} error={error} paused={paused} refresh={refresh} /></SpeakingAiConsentGate>}
        <div className={styles.divider} />
        {assessment ? <div className={styles.criteriaGrid}>{CRITERIA.map(({ key, label }) => {
          const value = assessment.criteria[key];
          return <div key={key} className={styles.criteriaItem}>
            <div className={styles.criteriaCircleWrap} role="img" aria-label={ui("{{value0}}: {{value1}}%", {value0:(label),value1:(value)})}>
              <svg viewBox="0 0 100 100" width="100" height="100" aria-hidden="true">
                <circle cx="50" cy="50" r="46" fill="white" stroke="#E0E0E0" strokeWidth="8" />
                <circle cx="50" cy="50" r="46" fill="transparent" stroke={getStatColor(value)} strokeWidth="8"
                  strokeDasharray={`${value * 2.89} 289`} transform="rotate(-90 50 50)" />
              </svg>
              <span className={styles.criteriaPctText}>{value}%</span>
            </div>
            <span className={styles.criteriaName}>{ui(label)}</span>
          </div>;
        })}</div> : <p className={extra.pending}>{ui("No criterion scores are available for this attempt.")}</p>}
      </section>
    </div>
    {parts.length > 1 && <nav className={styles.tabsRow} aria-label={ui("Speaking parts")}>
      <div className={styles.tabsContainer}>{parts.map(partNumber =>
        <button type="button" key={partNumber} onClick={() => setActivePart(partNumber)}
          className={`${styles.tabItem} ${extra.partButton}`} aria-current={activePart === partNumber ? 'page' : undefined}>
          <span className={activePart === partNumber ? styles.tabItemActive : ''}>
            <span className={activePart === partNumber ? styles.tabText : styles.tabTextInactive}>{ ui("Part") + ' ' }{partNumber}</span>
          </span>
        </button>)}</div>
    </nav>}
    {activePart && <PartContent attemptId={attemptId} partNumber={activePart} attempt={data} isPractice={isPractice} />}
    <div className={styles.actionRow}>
      <ResultBackButton to={isPractice ? '/speaking/practice' : '/speaking/tests'} />
      <button className={styles.tryAgainBtn} onClick={() => navigate(`/speaking/detail-result?attemptId=${attemptId}${isPractice ? '&practice=true' : ''}`)}>{ui("View detail result")}</button>
    </div>
  </div></div>;
}
