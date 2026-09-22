import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState';
import { useAttemptResult } from '../../test-attempts/hooks/useAttemptResult';
import { formatDuration } from '../../test-attempts/utils/attemptTime';
import { listeningTestsApi } from '../../admin/listening/services/listeningTestsApi';
import { testAttemptsApi } from '../../test-attempts/services/testAttemptsApi';
import styles from './ListeningResultPage.module.css';

function AnswerStatusIcon({ status }) {
  if (status === 'skipped') return <span style={{ color: '#686868', fontWeight: 'bold' }}>—</span>;
  if (status === 'correct') return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke="#43B75D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="#DA1E21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function getFeedback(percentage) {
  if (percentage >= 90) return { title: "Outstanding!", text: "Your listening skills are excellent. You demonstrated strong comprehension across all parts. Keep up this level!" };
  if (percentage >= 75) return { title: "Great job!", text: "You performed well and show solid listening comprehension. Review the few missed questions to reach the top level." };
  if (percentage >= 55) return { title: "Good effort!", text: "You have a decent grasp of listening skills, but there are areas to improve. Focus on opinion-matching and inference tasks." };
  if (percentage >= 35) return { title: "Keep practising!", text: "Your listening comprehension is developing. Try listening to more English content daily and retaking the test." };
  return { title: "Don't give up!", text: "This is a challenging test. We recommend reviewing each part's instructions and audio scripts carefully before retrying." };
}

function getStatColor(percentage) {
  if (percentage >= 75) return '#43B75D'; // Green
  if (percentage >= 40) return '#F5A623'; // Orange
  return '#DA1E21'; // Red
}

function ScoreRing({ percentage, size = 'large', children }) {
  const color = getStatColor(percentage);
  return (
    <div className={`${styles.scoreRing} ${size === 'small' ? styles.scoreRingSmall : ''}`} style={{ '--score': `${percentage * 3.6}deg`, '--score-color': color }}>
      <div className={styles.scoreRingInner}>{children}</div>
    </div>
  );
}

export default function ListeningResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const timedOut = searchParams.get('timedOut') === 'true';
  const { data, loading, error } = useAttemptResult(attemptId);

  const view = useMemo(() => {
    if (!data?.result) return null;
    const score = Number(data.score ?? 0);
    const maximum = Number(data.maxScore ?? 0);
    const percentage = maximum ? Math.round((score / maximum) * 100) : 0;
    const parts = (data.result.parts ?? []).map(part => ({
      label: `Part ${part.partNumber}`,
      partNumber: part.partNumber,
      score: Number(part.score ?? 0),
      total: Number(part.maxScore ?? 0),
      percentage: part.maxScore ? Math.round((part.score / part.maxScore) * 100) : 0,
    }));
    
    // Add global index for items
    let currentGlobalIdx = 1;
    const items = (data.result.items ?? []).map(item => ({
      ...item,
      number: currentGlobalIdx++,
      status: item.outcome === 'CORRECT' ? 'correct' : item.outcome === 'INCORRECT' ? 'wrong' : 'skipped',
      answer: item.outcome === 'SKIPPED' ? null : 'Answered',
    }));

    return { score, maximum, percentage, parts, items, counts: data.result.counts,
      cefrLevel: data.estimatedCefr,
      duration: data.startedAt && data.submittedAt ? formatDuration(data.startedAt, data.submittedAt) : '--:--:--' };
  }, [data]);

  if (loading || error) return <AttemptPageState loading={loading} error={error} />;
  if (!view) return <AttemptPageState error="This result is not available yet." />;
  const isFullTest = searchParams.get('isFull') === 'true';

  const columns = [];
  if (view.parts.length > 0) {
    const p1 = view.items.filter(i => i.partNumber === 1);
    if (p1.length > 6) {
      columns.push({ title: 'Part 1', items: p1.slice(0, Math.ceil(p1.length / 2)) });
      columns.push({ title: 'Part 1', items: p1.slice(Math.ceil(p1.length / 2)) });
    } else if (p1.length > 0) {
      columns.push({ title: 'Part 1', items: p1 });
    }
    const p2 = view.items.filter(i => i.partNumber === 2);
    if (p2.length > 0) columns.push({ title: 'Part 2', items: p2 });
    const p3 = view.items.filter(i => i.partNumber === 3);
    if (p3.length > 0) columns.push({ title: 'Part 3', items: p3 });
    const p4 = view.items.filter(i => i.partNumber === 4);
    if (p4.length > 0) columns.push({ title: 'Part 4', items: p4 });
  }

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        {(timedOut || data.submittedAfterExpiry) && (
          <div style={{ backgroundColor: '#ffebe9', border: '1px solid #ff8182', color: '#d1242f', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontWeight: '500' }}>
            Time's up! Your answers have been automatically submitted.
          </div>
        )}
        <div className={styles.topSection}>
          <div className={styles.cefrBox}>
            <div className={styles.cefrLabel}>CEFR Level</div>
            <div className={styles.cefrValue}>{view.cefrLevel ?? 'Not converted'}</div>
            <div className={styles.scoreText}>Score: {view.score}/{view.maximum}</div>
          </div>

          <div className={styles.resultBox}>
            <div className={styles.resultLabel}>Result</div>
            <div className={styles.resultContent}>
              <div className={styles.percentageCircle}>
                <svg viewBox="0 0 100 100" width="100" height="100">
                  <circle cx="50" cy="50" r="46" fill="white" stroke="#E0E0E0" strokeWidth="4" />
                  <circle cx="50" cy="50" r="46" fill="transparent" stroke={getStatColor(view.percentage)} strokeWidth="4" strokeDasharray={`${view.percentage * 2.89} 289`} strokeDashoffset="0" transform="rotate(-90 50 50)" />
                </svg>
                <div className={styles.percentageText}>{view.percentage}%</div>
              </div>
              <div className={styles.statsGrid}>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Testing time</span>
                  <span className={styles.statValueBold}>{view.duration}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabelCorrect}>Correct</span>
                  <span className={styles.statValue}>{view.counts.correct} sections</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabelWrong}>Wrong</span>
                  <span className={styles.statValue}>{view.counts.incorrect} section</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabelSkip}>Skip</span>
                  <span className={styles.statValue}>{view.counts.skipped} section</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {columns.length > 0 && (
          <div className={styles.detailBox}>
            <div className={styles.resultLabel} style={{ color: '#A11D33', fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Answer overview</div>
            <div className={styles.columnsWrapper} style={{ gap: '32px', overflowX: 'auto' }}>
              {columns.map((col, idx) => (
                <div className={styles.mainColumn} key={idx} style={{ flex: '0 0 auto', minWidth: '120px' }}>
                  <div className={styles.partColumn}>
                    <div className={styles.partTitle} style={{ fontSize: '20px', marginBottom: '12px' }}>{col.title}</div>
                    {col.items.map(item => (
                      <div className={styles.answerRow} key={item.key}>
                        <div className={styles.qId}>{item.number}</div>
                        <div className={styles.userAns} style={{ flex: 'none', minWidth: '24px' }}>{item.answer ?? '--'}</div>
                        <div className={styles.iconWrap}><AnswerStatusIcon status={item.status} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.feedbackBox}>
          <div className={styles.feedbackLabel}>Feedback</div>
          <div className={styles.feedbackText}>
            <strong style={{ color: getStatColor(view.percentage) }}>{getFeedback(view.percentage).title}</strong> {getFeedback(view.percentage).text}
          </div>
        </div>

        {view.parts.length > 0 && (
          <div className={styles.statsBox}>
            <div className={styles.statsLabel}>Statistics</div>
            <div className={styles.circlesWrapper}>
              {view.parts.map((p, idx) => {
                const color = getStatColor(p.percentage);
                return (
                  <div key={idx} className={styles.circleItem}>
                    <div className={styles.statCircleWrap}>
                      <svg viewBox="0 0 80 80" width="80" height="80">
                        <circle cx="40" cy="40" r="36" fill="white" stroke="#E0E0E0" strokeWidth="4" />
                        <circle
                          cx="40" cy="40" r="36"
                          fill="transparent"
                          stroke={color}
                          strokeWidth="4"
                          strokeDasharray={`${p.percentage * 2.26} 226`}
                          strokeDashoffset="0"
                          transform="rotate(-90 40 40)"
                        />
                      </svg>
                      <div className={styles.statPercentageText}>{p.percentage}%</div>
                    </div>
                    <div className={styles.statName}>{p.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className={styles.actionRow}>
          <button
            className={`${styles.tryAgainBtn} ${styles.detailBtn || ''}`}
            style={{ backgroundColor: '#da1e21', borderColor: '#da1e21' }}
            onClick={() => navigate(`/listening/detail-result?attemptId=${attemptId}`)}
          >
            View detail result
          </button>
          <button className={styles.backBtn} onClick={() => navigate('/listening/tests')}>Back to tests</button>
        </div>
      </div>
    </div>
  );
}
