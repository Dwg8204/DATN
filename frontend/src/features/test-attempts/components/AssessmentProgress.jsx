import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { useEffect, useRef, useState } from 'react';
import { estimatedProgress, progressStage } from '../utils/assessmentProgress.js';
import styles from './AssessmentProgress.module.css';

const messages = {
  SUBMITTING: 'Đang lưu và nộp bài', LOADING_RESULT: 'Đang kiểm tra kết quả',
  QUEUED: 'Đang chờ đến lượt chấm bài', PROCESSING: 'AI đang chấm bài',
  LONG_WAIT: 'Chấm bài lâu hơn dự kiến. Tự động kiểm tra đã tạm dừng.',
  COMPLETED: 'Đã chấm xong', PAUSED: 'Chấm bài đang tạm dừng hoặc chưa được bật',
  FAILED: 'Chưa thể hoàn tất chấm bài', CONNECTION_ERROR: 'Không kết nối được để kiểm tra kết quả',
};

function ProgressSession(props) {
  const ui = useUiTranslation();
  const stage = progressStage(props);
  const [progress, setProgress] = useState(() => estimatedProgress(stage, 0));
  useEffect(() => {
    const started = Date.now();
    const update = () => setProgress(previous => estimatedProgress(stage, (Date.now() - started) / 1000, previous));
    update();
    if (!['SUBMITTING', 'LOADING_RESULT', 'QUEUED', 'PROCESSING'].includes(stage)) return undefined;
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [stage]);
  const value = stage === 'COMPLETED' ? 100 : Math.min(95, Math.round(progress));
  return <section className={styles.panel} aria-label={ui("Assessment progress")}>
    <div className={styles.heading}><strong aria-live="polite">{ui(messages[stage])}</strong><span aria-hidden="true">{value}%</span></div>
    <div className={styles.track} role="progressbar" aria-label={ui(messages[stage])} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div className={styles.fill} style={{ width: `${value}%` }} />
    </div>
    <small>{ui("Estimated progress")}{stage !== 'SUBMITTING' && stage !== 'LOADING_RESULT' ? ui("· Your responses have been saved.") : ''}</small>
    {props.error && <p role="alert">{ui.error(props.error)}</p>}
    {props.refresh && stage !== 'COMPLETED' && <button type="button" onClick={props.refresh}>{ui("Check again")}</button>}
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
    <ProgressSession key={`${props.attemptId ?? 'loading'}:${props.runKey ?? 0}`} {...props} />
  </div>;
}
