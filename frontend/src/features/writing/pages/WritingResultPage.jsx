import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import WritingScoreRing from '../components/WritingScoreRing';
import { getWritingAssessment, WRITING_PART_ORDER } from '../data/writingResultData';
import { getWritingSession } from '../utils/writingSessionStorage';
import styles from './WritingResultPage.module.css';

function duration(session) {
  const seconds = session.startTime ? Math.max(0, Math.floor(((session.submittedAt || Date.now()) - session.startTime) / 1000)) : 0;
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function WritingResultPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const session = useMemo(() => getWritingSession(), []);
  const isFull = params.get('isFull') === 'true';
  const timedOut = params.get('timedOut') === 'true';
  const part = params.get('part') || session.mode || 'part1';
  const parts = isFull || session.mode === 'full' ? WRITING_PART_ORDER : [part];
  const assessment = getWritingAssessment(session, parts);
  const query = `testId=${params.get('testId') || session.testId || '1'}&isFull=${isFull || session.mode === 'full'}&part=${part}`;
  const completedResponses = parts.reduce((sum, key) => sum + Object.values(session.answers?.[key] || {}).filter((answer) => String(answer).trim()).length, 0);

  return <div className={styles.page}><main>{timedOut && <div className={styles.notice}>Time expired. Your saved responses were submitted automatically.</div>}<h1>The result of the Writing test</h1><section className={styles.summary}><article className={styles.band}><div><h2>Band Score</h2><p>Your current estimated level</p></div><strong>{assessment.band}</strong></article><article className={styles.report}><div><h2>AI Assessment</h2><p>Review your estimated performance in each writing criterion.</p></div><div className={styles.criteria}>{assessment.criteria.map((criterion) => <WritingScoreRing key={criterion.key} score={criterion.score} label={criterion.label} />)}</div></article></section><section className={styles.panel}><h2>Test summary</h2><div className={styles.overview}><WritingScoreRing score={assessment.overall} /><dl><div><dt>Testing time</dt><dd>{duration(session)}</dd></div><div><dt>Test type</dt><dd>{isFull || session.mode === 'full' ? 'Full Writing Test' : part.replace('part', 'Part ')}</dd></div><div><dt>Completed responses</dt><dd>{completedResponses}</dd></div></dl></div></section><section className={styles.panel}><h2>Feedback</h2><p>{assessment.feedback}</p><small>This score is a frontend preview. Final AI scoring will be connected to the backend assessment service.</small></section><div className={styles.actions}><button onClick={() => navigate(`/writing/result-detail?${query}`)}>View detail result</button><button onClick={() => navigate('/writing/tests')}>Take another test</button></div></main></div>;
}
