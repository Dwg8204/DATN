import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getAllAnswers, getTestMeta, clearListeningSession, saveListeningResult } from '../utils/listeningSessionStorage';
import { PART1_QUESTIONS } from '../data/part1MockData';
import { PART2_DATA } from '../data/part2MockData';
import { PART3_DATA } from '../data/part3MockData';
import { PART4_QUESTIONS } from '../data/part4MockData';
import styles from './ListeningResultPage.module.css';

function getCefrLevel(percentage) {
  if (percentage >= 90) return 'C1';
  if (percentage >= 75) return 'B2';
  if (percentage >= 55) return 'B1';
  if (percentage >= 35) return 'A2';
  return 'A1';
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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

export default function ListeningResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isFullTest = searchParams.get('isFull') === 'true';
  const partParam = searchParams.get('part');

  const [results, setResults] = useState(null);

  useEffect(() => {
    const allAnswers = getAllAnswers();
    const { startTime } = getTestMeta();
    const timeSpent = startTime ? Date.now() - startTime : 0;

    // Process Part 1 (13 questions)
    // NOTE: sessionStorage JSON.parse returns string keys, but q.id is a number.
    // We must cast to Number when looking up: allAnswers.part1[q.id] → use String(q.id) as key.
    const p1Raw = allAnswers.part1; // e.g. { "1": 0, "2": 2, ... }
    const part1Results = PART1_QUESTIONS.map(q => {
      const userAnswerIdx = p1Raw[String(q.id)]; // cast to string key
      const isSkipped = userAnswerIdx === undefined || userAnswerIdx === null;
      const userAnswerStr = !isSkipped ? String.fromCharCode(65 + Number(userAnswerIdx)) : null;
      const isCorrect = !isSkipped && Number(userAnswerIdx) === q.answer;
      return { id: q.id, userAnswer: userAnswerStr, isCorrect, isSkipped };
    });

    // Process Part 2 (4 speakers -> 4 answers)
    // answers saved as { "0": "now enjoys science", "1": "...", ... }
    const p2Raw = allAnswers.part2;
    const part2Results = PART2_DATA.speakers.map((speaker, idx) => {
      const userAnswer = p2Raw[String(idx)];
      const correctAnswer = PART2_DATA.answers[idx];
      const isSkipped = !userAnswer;
      return { id: `14.${idx + 1}`, userAnswer: userAnswer || null, isCorrect: !isSkipped && userAnswer === correctAnswer, isSkipped };
    });

    // Process Part 3 (4 statements -> 4 answers)
    // answers saved as { "15a": "Both", "15b": "Man", ... } — keys are already strings, OK
    const p3Raw = allAnswers.part3;
    const part3Results = PART3_DATA.statements.map(stmt => {
      const userAnswer = p3Raw[stmt.id];
      const correctAnswer = PART3_DATA.answers[stmt.id];
      const isSkipped = !userAnswer;
      return { id: stmt.id, userAnswer: userAnswer || null, isCorrect: !isSkipped && userAnswer === correctAnswer, isSkipped };
    });

    // Process Part 4 (2 questions)
    // answers saved as { "16": 0, "17": 1, ... }
    const p4Raw = allAnswers.part4;
    const part4Results = PART4_QUESTIONS.flatMap(mainQ =>
      mainQ.subQuestions.map(sq => {
        const userAnswerIdx = p4Raw[String(sq.id)];
        const isSkipped = userAnswerIdx === undefined || userAnswerIdx === null;
        const userAnswerStr = !isSkipped ? String.fromCharCode(65 + Number(userAnswerIdx)) : null;
        const isCorrect = !isSkipped && Number(userAnswerIdx) === sq.answer;
        return { id: sq.id, userAnswer: userAnswerStr, isCorrect, isSkipped };
      })
    );

    let allResults = [];
    if (isFullTest) {
      allResults = [...part1Results, ...part2Results, ...part3Results, ...part4Results];
    } else {
      if (partParam === '1') allResults = part1Results;
      if (partParam === '2') allResults = part2Results;
      if (partParam === '3') allResults = part3Results;
      if (partParam === '4') allResults = part4Results;
    }

    const totalQuestions = allResults.length;
    const correctCount = allResults.filter(r => r.isCorrect).length;
    const skipCount = allResults.filter(r => r.isSkipped).length;
    const wrongCount = totalQuestions - correctCount - skipCount;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const cefrLevel = getCefrLevel(percentage);

    const getPartStats = (partResults) => {
      const total = partResults.length;
      const correct = partResults.filter(r => r.isCorrect).length;
      return total > 0 ? Math.round((correct / total) * 100) : 0;
    };

    const partStats = {
      'Part 1': getPartStats(part1Results),
      'Part 2': getPartStats(part2Results),
      'Part 3': getPartStats(part3Results),
      'Part 4': getPartStats(part4Results),
    };

    const resultData = {
      part1Results,
      part2Results,
      part3Results,
      part4Results,
      totalCorrect: correctCount,
      totalWrong: wrongCount,
      totalSkip: skipCount,
      percentage,
      cefrLevel,
      timeString: formatTime(timeSpent),
      totalQuestions,
      partStats
    };

    setResults(resultData);

    const { testId } = getTestMeta();
    if (testId) {
      saveListeningResult(testId, isFullTest, partParam, {
        accuracy: percentage,
        cefrLevel,
        timeString: formatTime(timeSpent),
        allAnswers: { p1Raw, p2Raw, p3Raw, p4Raw },
      });
    }

  }, [isFullTest, partParam]);

  if (!results) return null;

  const renderIcon = (isCorrect, isSkipped) => {
    if (isSkipped) return <span style={{ color: '#686868' }}>-</span>;
    if (isCorrect) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17 14" width="17" height="14">
          <path d="M2.85439 6.5342C2.20131 5.82174 1.14244 5.82174 0.489357 6.5342C-0.16373 7.24666 -0.16373 8.40178 0.489357 9.11424L1.67188 7.82422L2.85439 6.5342ZM5.33854 11.8242L4.15602 13.1142C4.80911 13.8267 5.86797 13.8267 6.52106 13.1142L5.33854 11.8242ZM15.6877 3.11424C16.3408 2.40178 16.3408 1.24666 15.6877 0.534199C15.0346 -0.17826 13.9758 -0.178259 13.3227 0.534199L14.5052 1.82422L15.6877 3.11424ZM1.67188 7.82422L0.489357 9.11424L4.15602 13.1142L5.33854 11.8242L6.52106 10.5342L2.85439 6.5342L1.67188 7.82422ZM5.33854 11.8242L6.52106 13.1142L15.6877 3.11424L14.5052 1.82422L13.3227 0.534199L4.15602 10.5342L5.33854 11.8242Z" fill="#43B75D" />
        </svg>
      );
    }
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15" width="15" height="15">
        <path d="M13.5 1.5L1.5 13.5" stroke="#C71F37" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M1.5 1.5L13.5 13.5" stroke="#C71F37" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const renderPartColumn = (title, items) => {
    if (items.length === 0) return null;
    return (
      <div className={styles.partColumn}>
        <div className={styles.partTitle}>{title}</div>
        {items.map(item => (
          <div key={item.id} className={styles.answerRow}>
            <span className={styles.qId}>{item.id}</span>
            <span className={styles.userAns}>{item.userAnswer || '--'}</span>
            <div className={styles.iconWrap}>
              {renderIcon(item.isCorrect, item.isSkipped)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const isTimedOut = searchParams.get('timedOut') === 'true';

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        {isTimedOut && (
          <div style={{ backgroundColor: '#ffebe9', border: '1px solid #ff8182', color: '#d1242f', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontWeight: '500' }}>
            Time's up! Your answers have been automatically submitted.
          </div>
        )}
        <div className={styles.topSection}>
          <div className={styles.cefrBox}>
            <div className={styles.cefrLabel}>CEFR Level</div>
            <div className={styles.cefrValue}>{results.cefrLevel}</div>
            <div className={styles.scoreText}>Score: {results.totalCorrect}/{results.totalQuestions}</div>
          </div>

          <div className={styles.resultBox}>
            <div className={styles.resultLabel}>Result</div>
            <div className={styles.resultContent}>
              <div className={styles.percentageCircle}>
                <svg viewBox="0 0 100 100" width="100" height="100">
                  <circle cx="50" cy="50" r="46" fill="white" stroke="#E0E0E0" strokeWidth="4" />
                  <circle cx="50" cy="50" r="46" fill="transparent" stroke="#43B75D" strokeWidth="4" strokeDasharray={`${results.percentage * 2.89} 289`} strokeDashoffset="0" transform="rotate(-90 50 50)" />
                </svg>
                <div className={styles.percentageText}>{results.percentage}%</div>
              </div>
              <div className={styles.statsGrid}>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Testing time</span>
                  <span className={styles.statValueBold}>{results.timeString}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabelCorrect}>Correct</span>
                  <span className={styles.statValue}>{results.totalCorrect} sections</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabelWrong}>Wrong</span>
                  <span className={styles.statValue}>{results.totalWrong} section</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabelSkip}>Skip</span>
                  <span className={styles.statValue}>{results.totalSkip} section</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.detailBox}>
          <div className={styles.resultLabel}>Result</div>
          <div className={styles.columnsWrapper}>
            {(isFullTest || partParam === '1') && (
              <>
                <div className={styles.mainColumn}>
                  {renderPartColumn('Part 1', results.part1Results.slice(0, 7))}
                </div>
                <div className={styles.mainColumn}>
                  <div className={styles.partColumn}>
                    {/* Empty title space to align with the first column */}
                    <div className={styles.partTitle} style={{ visibility: 'hidden' }}>Part 1</div>
                    {results.part1Results.slice(7).map(item => (
                      <div key={item.id} className={styles.answerRow}>
                        <span className={styles.qId}>{item.id}</span>
                        <span className={styles.userAns}>{item.userAnswer || '--'}</span>
                        <div className={styles.iconWrap}>
                          {renderIcon(item.isCorrect, item.isSkipped)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {(isFullTest || partParam === '2' || partParam === '3') && (
              <div className={styles.mainColumn}>
                {(isFullTest || partParam === '2') && renderPartColumn('Part 2', results.part2Results)}
                {(isFullTest || partParam === '3') && renderPartColumn('Part 3', results.part3Results)}
              </div>
            )}

            {(isFullTest || partParam === '4') && (
              <div className={styles.mainColumn}>
                {renderPartColumn('Part 4', results.part4Results)}
              </div>
            )}
          </div>
        </div>

        <div className={styles.feedbackBox}>
          <div className={styles.feedbackLabel}>Feedback</div>
          <div className={styles.feedbackText}>
            <strong style={{ color: getStatColor(results.percentage) }}>{getFeedback(results.percentage).title}</strong> {getFeedback(results.percentage).text}
          </div>
        </div>

        {isFullTest && (
          <div className={styles.statsBox}>
            <div className={styles.statsLabel}>Statistics</div>
            <div className={styles.circlesWrapper}>
              {['Part 1', 'Part 2', 'Part 3', 'Part 4'].map((p, idx) => {
                const pct = results.partStats[p] || 0;
                const color = getStatColor(pct);
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
                          strokeDasharray={`${pct * 2.26} 226`}
                          strokeDashoffset="0"
                          transform="rotate(-90 40 40)"
                        />
                      </svg>
                      <div className={styles.statPercentageText}>{pct}%</div>
                    </div>
                    <div className={styles.statName}>{p}</div>
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
            onClick={() => navigate(`/listening/detail-result?testId=${searchParams.get('testId') || '1'}&isFull=${isFullTest}${!isFullTest ? `&part=${partParam}` : ''}`)}
          >
            View detail result
          </button>
          <button className={styles.backBtn} onClick={() => navigate('/listening/tests')}>Back to tests</button>
        </div>
      </div>
    </div>
  );
}
