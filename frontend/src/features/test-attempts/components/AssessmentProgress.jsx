import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { useEffect, useRef, useState } from 'react';
import { estimatedProgress, groqPartProgress, groqFailureReason, progressStage, progressStorageKey, readProgress, saveProgress } from '../utils/assessmentProgress.js';
import styles from './AssessmentProgress.module.css';
import { useTranslation } from 'react-i18next';

const messages = {
  SUBMITTING: 'Đang lưu và nộp bài', LOADING_RESULT: 'Đang kiểm tra kết quả',
  QUEUED: 'Đang chờ đến lượt chấm bài', PROCESSING: 'AI đang chấm bài',
  RETRY_WAIT: 'Dịch vụ AI tạm thời bận. Đang chờ thử lại.',
  LONG_WAIT: 'Chấm bài lâu hơn dự kiến. Tự động kiểm tra đã tạm dừng.',
  COMPLETED: 'Đã chấm xong', PAUSED: 'Chấm bài đang tạm dừng hoặc chưa được bật',
  FAILED: 'Chưa thể hoàn tất chấm bài', CONNECTION_ERROR: 'Không kết nối được để kiểm tra kết quả',
};

function ProgressSession(props) {
  const ui = useUiTranslation();
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now);
  const stage = progressStage(props);
  const storageKey = progressStorageKey(props.attemptId, props.data?.assessmentProvider, props.runKey);
  const [progress, setProgress] = useState(() => estimatedProgress(stage, 0, readProgress(storageKey)));
  useEffect(() => { saveProgress(storageKey, progress); }, [storageKey, progress]);
  useEffect(() => {
    if (!['RETRY_WAIT','RATE_WAIT'].includes(stage)) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [stage]);
  useEffect(() => {
    const started = Date.now();
    const update = () => setProgress(previous => estimatedProgress(stage, (Date.now() - started) / 1000, previous));
    update();
    if (!['SUBMITTING', 'LOADING_RESULT', 'QUEUED', 'PROCESSING'].includes(stage)) return undefined;
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [stage]);
  const source=props.data?.assessmentProvider==='groq'?'Groq':'Gemini';
  const assessment=props.data?.assessment;
  const isGroq=source==='Groq';
  const value=isGroq && props.data?.component==='WRITING' ? groqPartProgress(stage,assessment?.completedParts)
    :stage === 'COMPLETED' ? 100 : Math.min(95, Math.round(progress));
  const partNumber=/^part_([1-4])$/.exec(assessment?.stage ?? '')?.[1];
  const stageLabel=partNumber?t('assessmentFlow.part',{number:partNumber}):assessment?.stage==='synthesis'?t('assessmentFlow.synthesis'):'';
  const message=isGroq && stage==='FAILED'?t(props.data?.component==='WRITING'?'assessmentFlow.failedWriting':'assessmentFlow.failed',{reason:t(`assessmentFlow.reasons.${groqFailureReason(assessment?.errorCode)}`)})
    :isGroq && ['QUEUED','PROCESSING','RATE_WAIT','RETRY_WAIT','LONG_WAIT'].includes(stage)?t(props.data?.component==='WRITING'?'assessmentFlow.gradingWriting':'assessmentFlow.grading')
    :stage==='RATE_WAIT'?t(assessment?.errorCode==='GROQ_DAILY_WAIT'?'assessmentFlow.quotaWait':'assessmentFlow.queueWait')
    :source==='Groq' && stage==='RETRY_WAIT' && ['AI_WRITING_EVIDENCE_INVALID','AI_INVALID_RESPONSE','GROQ_COMPACT_WRITING_INVALID','GROQ_JSON_GENERATION_FAILED','GROQ_RESPONSE_INCOMPLETE','GROQ_INVALID_JSON'].includes(assessment?.errorCode)?t('assessmentFlow.retryOutput')
    :stage==='PROCESSING' && stageLabel?t('assessmentFlow.processing',{stage:stageLabel}):ui(messages[stage]);
  return <section className={styles.panel} aria-label={`${source} · ${ui("Assessment progress")}`}>
    <div className={styles.heading}><strong aria-live="polite">{source} · {message}</strong><span aria-hidden="true">{value}%</span></div>
    <div className={styles.track} role="progressbar" aria-label={message} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div className={styles.fill} style={{ width: `${value}%` }} />
    </div>
    {!isGroq && <small>{ui("Estimated progress")}{stage !== 'SUBMITTING' && stage !== 'LOADING_RESULT' ? ui("· Your responses have been saved.") : ''}</small>}
    {props.error && <p role="alert">{ui.error(props.error)}</p>}
    {!isGroq && assessment?.completedParts?.length > 0 && <p>{t('assessmentFlow.saved',{parts:assessment.completedParts.join(', ')})}</p>}
    {!isGroq && stageLabel && ['RATE_WAIT','RETRY_WAIT','FAILED'].includes(stage) && <p>{t('assessmentFlow.pending',{stage:stageLabel})}</p>}
    {!isGroq && assessment?.errorCode && stage!=='COMPLETED' && <p role="status">{assessment.errorCode}</p>}
    {!isGroq && ['RETRY_WAIT','RATE_WAIT'].includes(stage) && assessment?.nextRetryAt && <p role="status">{t(stage==='RETRY_WAIT'?'assessmentFlow.retryWait':'assessmentFlow.wait',{seconds:Math.max(0,Math.ceil((Date.parse(assessment.nextRetryAt)-now)/1000))})}</p>}
    {props.refresh && stage !== 'COMPLETED' && (!isGroq || ['FAILED','CONNECTION_ERROR','LONG_WAIT','PAUSED'].includes(stage)) && <button type="button" onClick={props.refresh}>{ui("Check again")}</button>}
  </section>;
}

export default function AssessmentProgress(props) {
  const ui = useUiTranslation();
  const container = useRef(null);
  useEffect(() => {
    if (!props.overlay) return undefined;
    const previous = document.activeElement;
    container.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, [props.overlay]);
  return <div ref={container} className={props.overlay ? styles.overlay : undefined}
    role={props.overlay ? 'dialog' : undefined} aria-modal={props.overlay || undefined}
    aria-label={props.overlay ? ui("Submitting your test") : undefined} tabIndex={props.overlay ? -1 : undefined}
    onKeyDown={props.overlay ? event => { if (event.key === 'Tab') event.preventDefault(); } : undefined}>
    <ProgressSession key={`${props.attemptId ?? 'loading'}:${props.data?.assessmentProvider ?? 'gemini'}:${props.runKey ?? 0}`} {...props} />
  </div>;
}
