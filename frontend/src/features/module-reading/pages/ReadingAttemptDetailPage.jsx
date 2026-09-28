import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AnswerSelect from '../../../components/common/AnswerSelect.jsx';
import RichTextContent from '../../../components/common/RichTextContent.jsx';
import AnswerExplanation from '../../../components/common/AnswerExplanation.jsx';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState.jsx';
import { useAttemptPartResult, useAttemptResult } from '../../test-attempts/hooks/useAttemptResult.js';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState.js';
import styles from './ReadingAttemptDetailPage.module.css';

const SCHEMA = { part: queryParam.positiveInt(1, 4) };
export default function ReadingAttemptDetailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const attemptId = params.get('attemptId');
  const isPractice = params.get('practice') === 'true';
  const [url, setUrl] = useUrlQueryState(SCHEMA);
  const summary = useAttemptResult(attemptId, 'READING');
  const parts = useMemo(() => summary.data?.result?.parts?.map(item => item.partNumber) ?? [], [summary.data]);
  const activePart = parts.includes(url.part) ? url.part : parts[0];
  const detail = useAttemptPartResult(attemptId, activePart, 'READING');
  const outcomes = useMemo(() => new Map((detail.data?.items ?? []).map(item => [item.key, item])), [detail.data]);
  if (summary.loading || summary.error || detail.loading || detail.error) return <AttemptPageState loading={summary.loading || detail.loading} error={summary.error || detail.error} />;
  if (!detail.data) return <AttemptPageState error="This detailed result is not available." />;
  const paper = detail.data.paper;
  const rows = activePart === 1 ? paper.questions.map(item => ({ key: item.key, prompt: `Gap ${item.position}`, options: item.options }))
    : activePart === 2 ? paper.positions.map(item => ({ key: item.key, prompt: `Position ${item.position}`, options: paper.options }))
      : activePart === 3 ? paper.questions.map(item => ({ key: item.key, prompt: item.statement, options: paper.speakers.map(speaker => ({ id: speaker.id, text: speaker.name })) }))
        : paper.paragraphs.map(item => ({ key: item.key, prompt: item.content, options: paper.headings }));
  return <div className={styles.page}><main>
    <header><div><span>READING RESULT</span><h1>{summary.data.title || 'Detailed answers'}</h1></div>
      {parts.length > 1 && <AnswerSelect value={String(activePart)} onChange={event => setUrl({ part: Number(event.target.value) })}
        options={parts.map(part => ({ value: String(part), label: `Part ${part}` }))} ariaLabel="Result part" />}</header>
    <div className={styles.rows}>{rows.map((row, index) => {
      const item = outcomes.get(row.key); const selected = item?.selectedAnswer?.optionId;
      return <article key={row.key} className={styles[item?.outcome?.outcome?.toLowerCase()]}><div className={styles.number}>{index + 1}</div><div>
        <RichTextContent value={row.prompt} />
        <div className={styles.options}>{row.options?.map(option => {
          const correct = option.id === item?.correctAnswer;
          const wrong = option.id === selected && !correct;
          return <div key={option.id} className={`${correct ? styles.correctOption : ''} ${wrong ? styles.wrongOption : ''}`}>
            <span>{option.id}</span><strong>{option.text}</strong>
          </div>;
        })}</div>
        <AnswerExplanation text={item?.explanation} />
      </div></article>;
    })}</div>
    <button className={styles.back} onClick={() => navigate(isPractice ? '/reading/practice' : '/reading/tests')}>Take another</button>
  </main></div>;
}
