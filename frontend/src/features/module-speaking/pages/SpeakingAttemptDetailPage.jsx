import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import RichTextContent from '../../../components/common/RichTextContent.jsx';
import AnswerSelect from '../../../components/common/AnswerSelect.jsx';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState.jsx';
import { useAttemptPartResult, useAttemptResult } from '../../test-attempts/hooks/useAttemptResult.js';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState.js';
import styles from './SpeakingAttemptDetailPage.module.css';

const SCHEMA = { part: queryParam.positiveInt(1, 4) };

export default function SpeakingAttemptDetailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const attemptId = params.get('attemptId');
  const isPractice = params.get('practice') === 'true';
  const [url, setUrl] = useUrlQueryState(SCHEMA);
  const summary = useAttemptResult(attemptId, 'SPEAKING');
  const parts = useMemo(() => summary.data?.result?.parts?.map(item => item.partNumber) ?? [], [summary.data]);
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
    <section className={styles.notice}><strong>AI feedback is not connected yet.</strong><p>Your submitted recording references are stored safely for later assessment.</p></section>
    <div className={styles.cards}>{prompts.map((prompt, index) => {
      const item = itemByKey.get(prompt.key);
      return <article key={prompt.key}><div className={styles.number}>{index + 1}</div><div>
        <RichTextContent value={prompt.text} />
        {prompt.prompts?.map((child, childIndex) => <RichTextContent key={childIndex} value={`${childIndex + 1}. ${child.text}`} />)}
        <p className={styles.recording}>{item?.selectedAnswer ? '✓ Recording submitted' : 'No recording submitted'}</p>
        {item?.sampleAnswer && <div className={styles.sample}><strong>Sample answer</strong><RichTextContent value={item.sampleAnswer} /></div>}
      </div></article>;
    })}</div>
    <button className={styles.back} onClick={() => navigate(isPractice ? '/speaking/practice' : '/speaking/tests')}>Take another</button>
  </main></div>;
}
