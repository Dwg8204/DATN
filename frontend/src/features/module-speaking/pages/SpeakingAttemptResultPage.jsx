import { useTranslation } from 'react-i18next';
import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import ResultBackButton from '../../../components/common/ResultBackButton.jsx';
import AssessmentProgress from '../../test-attempts/components/AssessmentProgress.jsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState.jsx';
import { useAttemptResult } from '../../test-attempts/hooks/useAttemptResult.js';
import SpeakingAiConsentGate from '../components/SpeakingAiConsentGate.jsx';
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

export default function SpeakingAttemptResultPage() {
  const ui = useUiTranslation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const attemptId = params.get('attemptId');
  const isPractice = params.get('practice') === 'true';
  const { data, loading, error, paused, refresh } = useAttemptResult(attemptId, 'SPEAKING');
  if (loading || (error && !data)) return <AttemptPageState loading={loading} error={error}
    backHref={isPractice ? '/speaking/practice' : '/speaking/tests'} />;
  if (!data?.result) return <AttemptPageState error={ui("This Speaking result is not available.")}  backHref={isPractice ? '/speaking/practice' : '/speaking/tests'} />;

  const assessment = data.result.speaking;
  const isFullSkill = data.scope === 'FULL_SKILL';

  return <div className={styles.page}><div className={styles.contentWrap}>
    {data.result.method !== 'PENDING_AI' && <AssessmentProgress attemptId={attemptId} data={data} error={error} refresh={refresh} />}
    <div className={styles.topSection}>
      <section className={styles.cefrBox}>
        <h1 className={styles.cefrLabel}>{!isFullSkill ? t('speakingDetailedFeedback.partAssessment') : assessment?.provider === 'RANDOM' ? ui("CEFR · Simulated") : ui("CEFR · AI estimate")}</h1>
        {isFullSkill && <strong className={styles.cefrValue}>{assessment ? data.estimatedCefr || '—' : '—'}</strong>}
        <span className={extra.totalScore}>{assessment && data.score != null ? ui("{{value0}} / 50 · Practice score", {value0:(Number(data.score).toFixed(2))}) : ui("Not assessed")}</span>
      </section>
      <section className={styles.reportBox}>
        <h2 className={styles.reportTitle}>{ui("Report")}</h2>
        <p className={styles.reportSub}>{!isFullSkill ? t('speakingDetailedFeedback.partCefrNotice') : assessment?.provider === 'RANDOM' ? ui("Legacy simulated result; the audio has not been analyzed by AI.") : data.result.gradingNotice || ui("Your test is awaiting AI assessment. If the wait is long, refresh the page or contact an administrator.")}</p>
        {!isFullSkill && assessment?.provider === 'RANDOM' && <p className={styles.reportSub}>{ui("Legacy simulated result; the audio has not been analyzed by AI.")}</p>}
        {isFullSkill && assessment?.cefrReason && <p className={styles.reportSub}>{assessment.cefrReason}</p>}
        {data.result.method === 'PENDING_AI' && <SpeakingAiConsentGate requireWhenDisabled><AssessmentProgress attemptId={attemptId} data={data} error={error} paused={paused} refresh={refresh} /></SpeakingAiConsentGate>}
        <div className={styles.divider} />
        {assessment ? <div className={styles.criteriaGrid}>{CRITERIA.map(({ key, label }) => {
          const value = assessment.criteria[key];
          return <div key={key} className={styles.criteriaItem}>
            <div className={styles.criteriaCircleWrap} role="img" aria-label={value==null?`${ui(label)}: —`:ui("{{value0}}: {{value1}}%", {value0:(label),value1:(value)})}>
              <svg viewBox="0 0 100 100" width="100" height="100" aria-hidden="true">
                <circle cx="50" cy="50" r="46" fill="white" stroke="#E0E0E0" strokeWidth="8" />
                <circle cx="50" cy="50" r="46" fill="transparent" stroke={getStatColor(value)} strokeWidth="8"
                  strokeDasharray={`${(value ?? 0) * 2.89} 289`} transform="rotate(-90 50 50)" />
              </svg>
              <span className={styles.criteriaPctText}>{value==null?'—':`${value}%`}</span>
            </div>
            <span className={styles.criteriaName}>{ui(label)}</span>
          </div>;
        })}</div> : <p className={extra.pending}>{ui("No criterion scores are available for this attempt.")}</p>}
      </section>
    </div>
    <div className={styles.actionRow}>
      <ResultBackButton to={isPractice ? '/speaking/practice' : '/speaking/tests'} />
      <button className={styles.tryAgainBtn} onClick={() => navigate(`/speaking/detail-result?attemptId=${attemptId}${isPractice ? '&practice=true' : ''}${params.get('model')==='groq'?'&model=groq':''}`)}>{ui("View detail result")}</button>
    </div>
  </div></div>;
}
