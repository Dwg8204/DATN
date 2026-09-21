import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getAllAnswers, getTestMeta, clearListeningSession, saveListeningResult } from '../utils/listeningSessionStorage';
import { getListeningTestParts } from '../services/listeningTestRepository';
import { listeningTestsApi } from '../../admin/listening/services/listeningTestsApi';
import { saveHistoryEntry, saveHistorySnapshot } from '../../../utils/historyStorage';
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
  const historyIdParam = searchParams.get('historyId');
  const testIdParam = searchParams.get('testId');
  const historySaved = useRef(false);
  const reviewHistoryId = useRef(historyIdParam);

  const [results, setResults] = useState(null);

  useEffect(() => {
    async function loadResults() {
      let timeSpent = 0;
      const { startTime, testId, attemptId } = getTestMeta();
      const actualTestId = testIdParam || testId || '1';

      if (historyIdParam) {
        // Load from local storage for past attempts
        const stored = localStorage.getItem(`history_data_${historyIdParam}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setResults(parsed.resultData);
        }
        return;
      }

      const allAnswers = getAllAnswers();
      timeSpent = startTime ? Date.now() - startTime : 0;

      try {
        const response = await listeningTestsApi.submitAttempt(actualTestId, attemptId, {
          attemptId,
          answers: allAnswers,
          timeSpentMs: timeSpent
        });

        const percentage = response.maxScore > 0 ? Math.round((response.score / response.maxScore) * 100) : 0;
        
        const getPartStats = (partResults) => {
          if (!partResults || partResults.length === 0) return 0;
          const total = partResults.length;
          const correct = partResults.filter(r => r.isCorrect).length;
          return total > 0 ? Math.round((correct / total) * 100) : 0;
        };

        const resultData = {
          part1Results: response.partBreakdown.part1 || [],
          part2Results: response.partBreakdown.part2 || [],
          part3Results: response.partBreakdown.part3 || [],
          part4Results: response.partBreakdown.part4 || [],
          totalCorrect: response.totalCorrect,
          totalWrong: response.totalWrong,
          totalSkip: response.totalSkip,
          percentage,
          cefrLevel: response.estimatedCefr,
          timeString: formatTime(timeSpent),
          totalQuestions: response.totalCorrect + response.totalWrong + response.totalSkip,
          partStats: {
            'Part 1': getPartStats(response.partBreakdown.part1),
            'Part 2': getPartStats(response.partBreakdown.part2),
            'Part 3': getPartStats(response.partBreakdown.part3),
            'Part 4': getPartStats(response.partBreakdown.part4),
          }
        };

        setResults(resultData);
        
        // Save to local storage for detail view
        saveListeningResult(actualTestId, isFullTest, partParam, {
          accuracy: percentage,
          cefrLevel: response.estimatedCefr,
          timeString: formatTime(timeSpent),
          allAnswers,
          resultData
        });

        if (!historySaved.current) {
          historySaved.current = true;
          const newHistoryId = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          if (!saveHistorySnapshot(newHistoryId, {
            allAnswers,
            resultData,
            timeSpent
          })) return;

          reviewHistoryId.current = newHistoryId;
          const totalQ = resultData.totalQuestions;
          saveHistoryEntry({
            id: newHistoryId,
            skill: 'listening',
            testId: String(actualTestId),
            testName: `Aptis Listening Test ${actualTestId}`,
            mode: isFullTest ? 'full' : `part${partParam}`,
            submittedAt: new Date().toISOString(),
            timeSpent: formatTime(timeSpent),
            cefrLevel: response.estimatedCefr,
            correct: response.totalCorrect,
            wrong: response.totalWrong,
            skipped: response.totalSkip,
            total: totalQ,
            partScores: [
              resultData.part1Results.length > 0 ? { label: 'Part 1', correct: resultData.part1Results.filter(r => r.isCorrect).length, total: resultData.part1Results.length } : null,
              resultData.part2Results.length > 0 ? { label: 'Part 2', correct: resultData.part2Results.filter(r => r.isCorrect).length, total: resultData.part2Results.length } : null,
              resultData.part3Results.length > 0 ? { label: 'Part 3', correct: resultData.part3Results.filter(r => r.isCorrect).length, total: resultData.part3Results.length } : null,
              resultData.part4Results.length > 0 ? { label: 'Part 4', correct: resultData.part4Results.filter(r => r.isCorrect).length, total: resultData.part4Results.length } : null,
            ],
            reviewUrl: `/listening/result?testId=${actualTestId}&isFull=${isFullTest}${partParam ? `&part=${partParam}` : ''}&historyId=${newHistoryId}`
          });
        }
      } catch (err) {
        console.error('Submit failed', err);
      }
    }
    
    loadResults();
  }, [isFullTest, partParam, historyIdParam, testIdParam]);

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
            <div className={styles.cefrValue}>{results.cefrLevel ?? 'Not converted'}</div>
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
            onClick={() => navigate(`/listening/detail-result?testId=${searchParams.get('testId') || '1'}&isFull=${isFullTest}${!isFullTest ? `&part=${partParam}` : ''}${reviewHistoryId.current ? `&historyId=${reviewHistoryId.current}` : ''}`)}
          >
            View detail result
          </button>
          <button className={styles.backBtn} onClick={() => navigate('/listening/tests')}>Back to tests</button>
        </div>
      </div>
    </div>
  );
}
