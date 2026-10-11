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

function PartContent({ attemptId, partNumber, attempt }) {
  const { data, loading, error } = useAttemptPartResult(attemptId, partNumber, 'SPEAKING', attempt.assessmentRevision);
  if (loading || error) return <AttemptPageState loading={loading} error={error} />;
  if (!data) return <AttemptPageState error={`Part ${partNumber} is unavailable.`} />;

  const paper = data.paper;
  const questions = partNumber === 4
    ? [{ key: paper.responseKey, text: paper.topic, prompts: paper.questions }]
    : paper.questions ?? [];
  const answers = new Map((data.items ?? []).map(item => [item.key, item.selectedAnswer]));
  const outcomes = new Map((data.items ?? []).map(item => [item.key, item]));
  const status = speakingPartStatus(attempt, partNumber);

  return <div className={styles.mainBody}>
    <section className={styles.transcriptCol} aria-label={`Part ${partNumber} responses`}>
      <span className={styles.transcriptBadge}>Part {partNumber}</span>
      <div className={styles.qnaScrollArea}>{questions.map((question, index) => {
        const answer = answers.get(question.key);
        const hasAudio = answer?.kind === 'AUDIO' && Boolean(answer.mediaKey);
        return <div className={styles.qnaPair} key={question.key}>
          <div className={styles.examinerText}>
            <strong>{partNumber === 4 ? 'Examiner:' : `Examiner: Q${index + 1}:`}</strong>
            <RichTextContent value={question.text} />
            {question.prompts?.map((prompt, promptIndex) =>
              <RichTextContent key={promptIndex} value={`${promptIndex + 1}. ${prompt.text}`} />)}
          </div>
          <div className={styles.candidateText}>
            <strong>Candidate:</strong> {hasAudio ? 'Recording submitted' : 'Skipped — no recording submitted'}
            {hasAudio && <>
              <audio className={extra.audio} controls preload="none" src={answer.mediaKey}
                aria-label={`Your recording for Part ${partNumber}, question ${index + 1}`} />
              <p className={extra.mockNotice}>Transcript (English):</p>
              <p>{outcomes.get(question.key)?.assessment?.transcript || 'Chưa có transcript; bài đang chờ xử lý hoặc không có lời nói rõ ràng.'}</p>
            </>}
          </div>
        </div>;
      })}</div>
    </section>
    <aside className={styles.feedbackCol} aria-label={`Part ${partNumber} feedback`}>
      <div className={styles.feedbackCard}><div className={styles.feedbackText}>
        <strong>Part {partNumber}: {status.recorded} recorded, {Math.max(status.skipped, questions.length - status.recorded)} skipped</strong>
      </div></div>
      {status.recorded > 0 ? <>
        <div className={styles.feedbackCard}><div className={styles.feedbackText}>
          {attempt.result?.gradingNotice || 'Bản ghi âm đang chờ AI chấm; chưa có feedback thật.'}
        </div></div>
        {(data.items ?? []).filter(item => item.assessment).map((item, index) => <div key={item.key} className={styles.feedbackCard}>
          <div className={styles.feedbackText}><strong>Response {index + 1}</strong><p>{item.assessment.feedback}</p>
            {CRITERIA.map(({ key, label }) => <p key={key}>{label}: {item.assessment.criteria[key]}%</p>)}
            {item.assessment.qualityFlags?.length > 0 && <p>{item.assessment.qualityFlags.join(' · ')}</p>}
          </div></div>)}
      </> : <div className={styles.feedbackCard}><div className={styles.feedbackText}>Skipped — there is no recording to review.</div></div>}
    </aside>
  </div>;
}

export default function SpeakingAttemptResultPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const attemptId = params.get('attemptId');
  const isPractice = params.get('practice') === 'true';
  const { data, loading, error } = useAttemptResult(attemptId, 'SPEAKING');
  if (loading || error) return <AttemptPageState loading={loading} error={error}
    backHref={isPractice ? '/speaking/practice' : '/speaking/tests'} />;
  if (!data?.result) return <AttemptPageState error="This Speaking result is not available." />;

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
    <div className={styles.topSection}>
      <section className={styles.cefrBox}>
        <h1 className={styles.cefrLabel}>{assessment?.provider === 'RANDOM' ? 'CEFR · Simulated' : 'CEFR · AI estimate'}</h1>
        <strong className={styles.cefrValue}>{assessment ? data.estimatedCefr || '—' : '—'}</strong>
        <span className={extra.totalScore}>{assessment && data.score != null ? `${Number(data.score).toFixed(2)} / 50 · Practice score` : 'Not assessed'}</span>
      </section>
      <section className={styles.reportBox}>
        <h2 className={styles.reportTitle}>Report</h2>
        <p className={styles.reportSub}>{assessment?.provider === 'RANDOM' ? 'Kết quả mô phỏng cũ; audio chưa được AI phân tích.' : data.result.gradingNotice || 'Bài đang chờ AI chấm. Nếu chờ lâu, hãy tải lại trang hoặc liên hệ quản trị viên.'}</p>
        {assessment?.cefrReason && <p className={styles.reportSub}>{assessment.cefrReason}</p>}
        {data.result.method === 'PENDING_AI' && <SpeakingAiConsentGate requireWhenDisabled><p>Đã xác nhận gửi audio. Kết quả sẽ tự cập nhật khi chấm xong.</p></SpeakingAiConsentGate>}
        <div className={styles.divider} />
        {assessment ? <div className={styles.criteriaGrid}>{CRITERIA.map(({ key, label }) => {
          const value = assessment.criteria[key];
          return <div key={key} className={styles.criteriaItem}>
            <div className={styles.criteriaCircleWrap} role="img" aria-label={`${label}: ${value}%`}>
              <svg viewBox="0 0 100 100" width="100" height="100" aria-hidden="true">
                <circle cx="50" cy="50" r="46" fill="white" stroke="#E0E0E0" strokeWidth="8" />
                <circle cx="50" cy="50" r="46" fill="transparent" stroke={getStatColor(value)} strokeWidth="8"
                  strokeDasharray={`${value * 2.89} 289`} transform="rotate(-90 50 50)" />
              </svg>
              <span className={styles.criteriaPctText}>{value}%</span>
            </div>
            <span className={styles.criteriaName}>{label}</span>
          </div>;
        })}</div> : <p className={extra.pending}>No criterion scores are available for this attempt.</p>}
      </section>
    </div>
    {parts.length > 1 && <nav className={styles.tabsRow} aria-label="Speaking parts">
      <div className={styles.tabsContainer}>{parts.map(partNumber =>
        <button type="button" key={partNumber} onClick={() => setActivePart(partNumber)}
          className={`${styles.tabItem} ${extra.partButton}`} aria-current={activePart === partNumber ? 'page' : undefined}>
          <span className={activePart === partNumber ? styles.tabItemActive : ''}>
            <span className={activePart === partNumber ? styles.tabText : styles.tabTextInactive}>Part {partNumber}</span>
          </span>
        </button>)}</div>
    </nav>}
    {activePart && <PartContent attemptId={attemptId} partNumber={activePart} attempt={data} />}
    <div className={styles.actionRow}>
      <button className={styles.backBtn} onClick={() => navigate(isPractice ? '/speaking/practice' : '/speaking/tests')}>Back to tests</button>
      <button className={styles.tryAgainBtn} onClick={() => navigate(`/speaking/detail-result?attemptId=${attemptId}${isPractice ? '&practice=true' : ''}`)}>View detail result</button>
    </div>
  </div></div>;
}
