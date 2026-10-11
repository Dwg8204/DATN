import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../services/api.js';
import { normalizeApiError } from '../../../services/apiError.js';
import styles from './SpeakingAiConsentGate.module.css';

export default function SpeakingAiConsentGate({ children, requireWhenDisabled = false }) {
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
        error: normalizeApiError(error, 'Không kiểm tra được xác nhận chấm AI.').message }); });
    return () => controller.abort();
  }, [attemptId]);
  if (!attemptId) return children;
  if (state.id !== attemptId) return <section className={styles.panel}>Đang kiểm tra cấu hình chấm Speaking…</section>;
  if (state.error) return <section className={styles.panel} role="alert">{state.error}<button onClick={() => window.location.reload()}>Thử lại</button></section>;
  if (state.data?.consent || !state.data?.enabled && !requireWhenDisabled) return <>
    {!state.data?.enabled && <p className={styles.disabled}>Chấm Speaking bằng AI chưa được bật. Bài nộp chỉ lưu bản ghi âm, không tạo điểm giả.</p>}
    {children}
  </>;
  if (!state.data?.enabled) return <p className={styles.panel}>Chấm Speaking bằng AI hiện chưa được bật.</p>;
  async function confirm() {
    setSaving(true);
    try {
      const response = await api.post(`/speaking-grading/${attemptId}/consent`, {
        confirmedAdult: adult, accepted, policyVersion: state.data.policyVersion,
      }, { notifyOnError: false });
      setState({ id: attemptId, data: response.data, error: '' });
    } catch (error) { setState(previous => ({ ...previous, error: normalizeApiError(error, 'Không lưu được xác nhận.').message })); }
    finally { setSaving(false); }
  }
  return <section className={styles.panel} aria-label="Xác nhận chấm Speaking bằng AI">
    <h2>Chấm Speaking bằng AI — chỉ dành cho người từ 18 tuổi</h2>
    <p>Audio, câu hỏi và ảnh của đề sẽ được gửi tới Groq để tạo transcript và Google Gemini để chấm bài.
      Transcript và feedback được lưu cùng kết quả. CEFR là ước lượng của AI, không phải kết quả chứng chỉ;
      điểm /50 chỉ dùng luyện tập nội bộ. Không ghi thông tin cá nhân nhạy cảm trong câu trả lời.</p>
    <p>Bạn có thể không đồng ý và quay lại danh sách bài. Nếu đây là bài thi có thời gian, đồng hồ đã bắt đầu khi mở bài.</p>
    {state.data.billingTier === 'FREE' && <p>Google Gemini đang dùng Free tier: Google có thể dùng audio, nội dung gửi và kết quả để cải thiện sản phẩm;
      người đánh giá có thể xem xét dữ liệu. Dù nội dung câu trả lời là giả, giọng nói thật vẫn có thể nhận diện bạn.
      Không gửi thông tin cá nhân, nhạy cảm hoặc bí mật. Tính năng chỉ dành cho người từ 18 tuổi, không phục vụ người dùng tại EEA, Thụy Sĩ hoặc Anh trên Free tier.
      Hết quota sẽ chờ hoặc báo lỗi, không tự chuyển sang dịch vụ trả phí.
      {' '}<a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">Điều khoản Gemini API</a></p>}
    <label><input type="checkbox" checked={adult} onChange={event => setAdult(event.target.checked)} /> Tôi xác nhận đã đủ 18 tuổi.</label>
    <label><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /> Tôi đồng ý gửi audio đến Groq và Google Gemini để chấm bài.</label>
    <button type="button" disabled={!adult || !accepted || saving} onClick={confirm}>{saving ? 'Đang lưu…' : 'Đồng ý và tiếp tục'}</button>
    <a href={params.get('practice') === 'true' ? '/speaking/practice' : '/speaking/tests'}>Không đồng ý — quay lại</a>
  </section>;
}
