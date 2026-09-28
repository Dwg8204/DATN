import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import InstructionBlock from '../../../components/common/InstructionBlock.jsx';
import RichTextContent from '../../../components/common/RichTextContent.jsx';
import TestFooter from '../../../components/layout/TestFooter.jsx';
import MockAudioRecorder from '../../../components/shared/MockAudioRecorder/MockAudioRecorder.jsx';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal.jsx';
import PracticeAnswerReveal from '../../practice/components/PracticeAnswerReveal.jsx';
import { AttemptPageState, SaveIndicator } from '../../test-attempts/components/AttemptPageState.jsx';
import { useTestAttempt } from '../../test-attempts/context/testAttemptContextStore.js';
import styles from './SpeakingPartPage.module.css';
import { useToast } from '../../../context/ToastContext.jsx';
import { attemptMediaApi } from '../../test-attempts/services/attemptMediaApi.js';
import { getApiError } from '../../../services/apiError.js';

const RECORD_SECONDS = { 1: 30, 2: 45, 3: 45, 4: 120 };
const TITLES = {
  1: 'Answer three questions about yourself',
  2: 'Describe a picture and give reasons',
  3: 'Compare two pictures and explain your opinion',
  4: 'Speak on a given topic',
};

export default function SpeakingPartPage({ partNumber }) {
  const navigate = useNavigate();
  const { showError } = useToast();
  const [searchParams] = useSearchParams();
  const { attemptId, paper, answers, loading, loadError, saveStatus, isPractice,
    setAnswer, flush, submit, approveNavigation } = useTestAttempt();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [finished, setFinished] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RECORD_SECONDS[partNumber]);
  const [showSubmit, setShowSubmit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const timerRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const part = paper?.parts?.[String(partNumber)];
  const questions = useMemo(() => {
    if (!part) return [];
    if (partNumber === 4) return [{ key: part.responseKey, text: part.topic, prompts: part.questions }];
    return part.questions ?? [];
  }, [part, partNumber]);
  const current = questions[currentIndex];
  const isFull = paper?.mode === 'full';

  useEffect(() => () => {
    window.clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);
  useEffect(() => {
    window.clearInterval(timerRef.current);
    setRecording(false);
    setFinished(Boolean(current?.key && answers[current.key]));
    setSecondsLeft(RECORD_SECONDS[partNumber]);
  }, [answers, current?.key, partNumber]);

  if (loading || loadError) return <AttemptPageState loading={loading} error={loadError} />;
  if (!part || !current) return <AttemptPageState error={`Part ${partNumber} is not included in this test.`} />;

  const finishRecording = () => {
    window.clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };
  const startRecording = async () => {
    if (uploading || recording) return;
    try {
      if (!window.MediaRecorder) throw new Error('This browser does not support audio recording.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
        .find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        setRecording(false);
        stream.getTracks().forEach(track => track.stop());
        setUploading(true);
        try {
          const type = recorder.mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type });
          const extension = type.includes('ogg') ? 'ogg' : 'webm';
          const uploaded = await attemptMediaApi.uploadAudio(new File([blob], `speaking-${current.key}.${extension}`, { type }));
          setAnswer(current.key, { kind: 'AUDIO', mediaKey: uploaded.url });
          setFinished(true);
        } catch (error) {
          setFinished(false);
          showError(getApiError(error, 'The recording could not be uploaded. Please record it again.'));
        } finally {
          setUploading(false);
          chunksRef.current = [];
        }
      };
      recorder.start(1_000);
      setRecording(true);
      setFinished(false);
      setSecondsLeft(RECORD_SECONDS[partNumber]);
      timerRef.current = window.setInterval(() => {
        setSecondsLeft(value => {
          if (value <= 1) {
            window.clearInterval(timerRef.current);
            window.setTimeout(finishRecording, 0);
            return 0;
          }
          return value - 1;
        });
      }, 1000);
    } catch (error) {
      streamRef.current?.getTracks().forEach(track => track.stop());
      showError(error?.name === 'NotAllowedError'
        ? 'Microphone access was denied. Allow it in your browser settings and try again.'
        : getApiError(error, 'Unable to start audio recording.'));
    }
  };

  const goNextPart = async () => {
    await flush();
    const params = new URLSearchParams(searchParams);
    params.set('attemptId', attemptId);
    navigate(`/speaking/test/part${partNumber + 1}?${params.toString()}`);
  };
  const primaryAction = () => {
    if (uploading || recording) { showError('Wait for the current recording to finish uploading.'); return; }
    if (isFull && partNumber < 4) void goNextPart();
    else setShowSubmit(true);
  };
  const confirmSubmit = async () => {
    setShowSubmit(false);
    try {
      const result = await submit();
      if (result) {
        approveNavigation();
        navigate(`/speaking/result?attemptId=${attemptId}${isPractice ? '&practice=true' : ''}`);
      }
    } catch { /* Shared provider displays a consistent API error. */ }
  };
  const answeredIds = questions.filter(question => answers[question.key]).map(question => question.key);

  return <div className={styles.page}>
    <main className={styles.content}>
      <header className={styles.heading}>
        <div><strong>Speaking · Part {partNumber}</strong><span>{paper.title}</span></div>
        <SaveIndicator status={saveStatus} />
      </header>
      <InstructionBlock title={`Question ${currentIndex + 1} of ${questions.length}`}>
        {TITLES[partNumber]}. Record your response when you are ready.
      </InstructionBlock>
      <section className={styles.workspace}>
        <div className={styles.promptColumn}>
          <article className={styles.prompt}>
            <span>{currentIndex + 1}</span>
            <div><RichTextContent value={current.text} />
              {current.prompts?.map((prompt, index) => <RichTextContent key={index} value={`${index + 1}. ${prompt.text}`} />)}
            </div>
          </article>
          {part.imageUrl && <img className={styles.singleImage} src={part.imageUrl} alt="Speaking prompt" />}
          {part.imageUrls?.length > 0 && <div className={styles.imageGrid}>{part.imageUrls.map((url, index) =>
            <img key={url} src={url} alt={`Speaking prompt ${index + 1}`} />)}</div>}
          <PracticeAnswerReveal questionKey={current.key} />
        </div>
        <div className={styles.recorder}>
          <MockAudioRecorder isRecording={recording} isFinished={finished} timeLeft={secondsLeft}
            maxTime={RECORD_SECONDS[partNumber]} onStartRecord={() => void startRecording()} onStopRecord={finishRecording} disabled={uploading} />
          {uploading && <p className={styles.uploading} role="status">Uploading recording…</p>}
        </div>
      </section>
    </main>
    <TestFooter partLabel={`Part ${partNumber}`} questions={questions.map((question, index) => ({ id: question.key, displayLabel: index + 1 }))}
      answeredIds={answeredIds} currentPageQuestionIds={[current.key]}
      onQuestionClick={key => setCurrentIndex(Math.max(0, questions.findIndex(question => question.key === key)))}
      onPrevClick={() => setCurrentIndex(index => Math.max(0, index - 1))}
      onNextClick={() => setCurrentIndex(index => Math.min(questions.length - 1, index + 1))}
      onSubmitClick={primaryAction} submitLabel={isFull && partNumber < 4 ? 'Next Part' : 'Submit'}
      hasPrev={currentIndex > 0} hasNext={currentIndex < questions.length - 1} />
    <SubmitModal isOpen={showSubmit} onBack={() => setShowSubmit(false)} onNext={confirmSubmit} />
  </div>;
}
