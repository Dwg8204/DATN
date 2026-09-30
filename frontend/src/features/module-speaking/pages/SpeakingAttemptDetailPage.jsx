import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import RichTextContent from '../../../components/common/RichTextContent.jsx';
import AnswerSelect from '../../../components/common/AnswerSelect.jsx';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState.jsx';
import { useAttemptPartResult, useAttemptResult } from '../../test-attempts/hooks/useAttemptResult.js';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState.js';
import styles from './SpeakingAttemptDetailPage.module.css';
import { speakingResultParts } from '../utils/speakingResultParts.js';
import { MOCK_SPEAKING_RESULT } from '../data/speakingResultMockData.js';

const SCHEMA = { part: queryParam.positiveInt(1, 4) };

export default function SpeakingAttemptDetailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const attemptId = params.get('attemptId');
  const isPractice = params.get('practice') === 'true';
  const [url, setUrl] = useUrlQueryState(SCHEMA);
  const summary = useAttemptResult(attemptId, 'SPEAKING');
  const parts = useMemo(() => speakingResultParts(summary.data), [summary.data]);
  const activePart = parts.includes(url.part) ? url.part : parts[0];
  const detail = useAttemptPartResult(attemptId, activePart, 'SPEAKING');
  if (summary.loading || summary.error || detail.loading || detail.error) {
    return <AttemptPageState loading={summary.loading || detail.loading} error={summary.error || detail.error} />;
  }
  if (!detail.data) return <AttemptPageState error="This response is not available." />;
  const paper = detail.data.paper;
  const prompts = activePart === 4
    ? [{ key: paper.responseKey, text: paper.topic, prompts: paper.questions }]
    : paper.questions ?? [];
  const itemByKey = new Map((detail.data.items ?? []).map(item => [item.key, item]));
  return <div className={styles.page}><main>
    <header><div><span>SPEAKING RESULT</span><h1>{summary.data.title || 'Submitted responses'}</h1></div>
      {parts.length > 1 && <AnswerSelect value={String(activePart)} onChange={event => setUrl({ part: Number(event.target.value) })}
        options={parts.map(part => ({ value: String(part), label: `Part ${part}` }))} ariaLabel="Result part" />}</header>
    <section className={styles.notice}><strong>{summary.data.result?.speaking ? 'Simulated assessment' : 'Assessment pending'}</strong>
      <p>{summary.data.result?.speaking ? 'The four criterion scores are simulated; the recordings have not been analyzed.' : 'Your recordings are stored for later assessment.'}</p></section>
    <div className={styles.cards}>{prompts.map((prompt, index) => {
      const item = itemByKey.get(prompt.key);
      return <article key={prompt.key}><div className={styles.number}>{index + 1}</div><div>
        <RichTextContent value={prompt.text} />
        {prompt.prompts?.map((child, childIndex) => <RichTextContent key={childIndex} value={`${childIndex + 1}. ${child.text}`} />)}
        <p className={styles.recording}>{item?.selectedAnswer?.kind === 'AUDIO' ? '✓ Recording submitted' : 'Skipped — no recording submitted'}</p>
        {item?.selectedAnswer?.kind === 'AUDIO' && <>
          <audio controls preload="none" src={item.selectedAnswer.mediaKey} aria-label={`Your recording for question ${index + 1}`} />
          <p><em>Illustrative answer (mock data; not a transcription of your recording):</em></p>
          <p>{MOCK_SPEAKING_RESULT.parts[activePart]?.qna?.[index]?.answer ?? 'A sample response will appear here.'}</p>
        </>}
        {item?.sampleAnswer && <div className={styles.sample}><strong>Sample answer</strong><RichTextContent value={item.sampleAnswer} /></div>}
      </div></article>;
    })}</div>
    <button className={styles.back} onClick={() => navigate(isPractice ? '/speaking/practice' : '/speaking/tests')}>Take another</button>
  </main></div>;
}
