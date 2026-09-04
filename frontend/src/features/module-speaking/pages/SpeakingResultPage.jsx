import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MOCK_SPEAKING_RESULT } from '../data/speakingResultMockData';
import { saveHistoryEntry } from '../../../utils/historyStorage';
import styles from './SpeakingResultPage.module.css';

function getStatColor(percentage) {
  if (percentage >= 75) return '#43B75D'; // Green
  if (percentage >= 40) return '#F5A623'; // Orange
  return '#DA1E21'; // Red
}

export default function SpeakingResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const testId = searchParams.get('testId') || '1';
  const isFullTest = searchParams.get('isFull') === 'true';
  const partParam = searchParams.get('part'); // e.g. "1", "2"
  const historyIdParam = searchParams.get('historyId');

  // Use mock data
  const result = MOCK_SPEAKING_RESULT;

  // Default active part based on param, or part 1 if full test
  const defaultPart = (isFullTest || !partParam) ? 1 : parseInt(partParam);
  const [activePart, setActivePart] = useState(defaultPart);
  const [activeFeedbackTab, setActiveFeedbackTab] = useState('grammar'); // 'grammar' or 'vocab'

  const currentPartData = result.parts[activePart];

  const historySaved = useRef(false);

  useEffect(() => {
    if (historyIdParam) return;
    if (historySaved.current) return;
    historySaved.current = true;
    
    const newHistoryId = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    saveHistoryEntry({
      id: newHistoryId,
      skill: 'speaking',
      testId: String(testId),
      testName: `Aptis Speaking Test ${testId}`,
      mode: isFullTest ? 'full' : `part${activePart}`,
      submittedAt: new Date().toISOString(),
      timeSpent: '00:15:00', // Mock time
      cefrLevel: result.cefrLevel,
      criteria: [
        { label: 'Grammar & Vocabulary', score: result.overallScore.grammar },
        { label: 'Pronunciation', score: result.overallScore.pronunciation },
        { label: 'Fluency', score: result.overallScore.fluency },
        { label: 'Task Fulfillment', score: result.overallScore.taskFulfillment },
      ],
      reviewUrl: `/speaking/result?testId=${testId}&isFull=${isFullTest}${!isFullTest ? `&part=${activePart}` : ''}&historyId=${newHistoryId}`
    });
  }, [testId, isFullTest, activePart, result, historyIdParam]);

  const handleTryAgain = () => {
    if (isFullTest) {
      navigate(`/speaking/test/part1?testId=${testId}&isFull=true`);
    } else {
      navigate(`/speaking/test/part${activePart}?testId=${testId}&isFull=false`);
    }
  };

  const handleBackToTests = () => {
    navigate('/speaking/tests');
  };

  const tabs = isFullTest
    ? [1, 2, 3, 4]
    : [activePart];

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>

        {/* Top Section */}
        <div className={styles.topSection}>
          <div className={styles.cefrBox}>
            <div className={styles.cefrLabel}>CEFR level</div>
            <div className={styles.cefrValue}>{result.cefrLevel}</div>
          </div>

          <div className={styles.reportBox}>
            <div className={styles.reportTitle}>Report</div>
            <div className={styles.reportSub}>View detail feedback for each section of your speaking.</div>
            <div className={styles.divider}></div>

            <div className={styles.criteriaGrid}>
              {[
                { name: 'Grammar & Vocabulary', pct: result.overallScore.grammar }, // Using grammar for both in this combined view
                { name: 'Pronunciation', pct: result.overallScore.pronunciation },
                { name: 'Fluency', pct: result.overallScore.fluency },
                { name: 'Task Fulfillment', pct: result.overallScore.taskFulfillment }
              ].map((c, idx) => (
                <div key={idx} className={styles.criteriaItem}>
                  <div className={styles.criteriaCircleWrap}>
                    <svg viewBox="0 0 100 100" width="100" height="100">
                      <circle cx="50" cy="50" r="46" fill="white" stroke="#E0E0E0" strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r="46"
                        fill="transparent"
                        stroke={getStatColor(c.pct)}
                        strokeWidth="8"
                        strokeDasharray={`${c.pct * 2.89} 289`}
                        strokeDashoffset="0"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div className={styles.criteriaPctText}>{c.pct}%</div>
                  </div>
                  <div className={styles.criteriaName}>{c.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Part Tabs */}
        {isFullTest && (
          <div className={styles.tabsRow}>
            <div className={styles.tabsContainer}>
              {tabs.map(num => (
                <div
                  key={num}
                  className={styles.tabItem}
                  onClick={() => setActivePart(num)}
                >
                  <div className={activePart === num ? styles.tabItemActive : ''}>
                    <span className={activePart === num ? styles.tabText : styles.tabTextInactive}>
                      Part {num}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Body */}
        {currentPartData && (
          <div className={styles.mainBody}>
            <div className={styles.transcriptCol}>
              <div className={styles.transcriptBadge}>Part {activePart}</div>

              <div className={styles.qnaScrollArea}>
                {currentPartData.qna.map((item, idx) => (
                  <div key={idx} className={styles.qnaPair}>
                    <div className={styles.examinerText}>
                      <span style={{ fontWeight: 'bold' }}>
                        {activePart === 4 ? 'Examiner:' : `Examiner: Q${item.id}:`}
                      </span> {item.question}
                    </div>
                    <div className={styles.candidateText}>
                      <span style={{ fontWeight: 'bold' }}>Candidate:</span> {item.answer}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.feedbackCol}>
              <div className={styles.feedbackTabs}>
                <div
                  className={`${styles.fbTab} ${activeFeedbackTab === 'grammar' ? styles.fbTabActive : styles.fbTabInactive}`}
                  onClick={() => setActiveFeedbackTab('grammar')}
                >
                  Grammar
                </div>
                <div
                  className={`${styles.fbTab} ${activeFeedbackTab === 'vocab' ? styles.fbTabActive : styles.fbTabInactive}`}
                  onClick={() => setActiveFeedbackTab('vocab')}
                >
                  Vocab
                </div>
                <div
                  className={`${styles.fbTab} ${activeFeedbackTab === 'coherence' ? styles.fbTabActive : styles.fbTabInactive}`}
                  onClick={() => setActiveFeedbackTab('coherence')}
                >
                  Lập luận & Mạch lạc
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                {activeFeedbackTab === 'grammar' && (
                  <>
                    <div className={styles.feedbackCard}>
                      <div className={styles.feedbackText}>{currentPartData.grammarFeedback}</div>
                    </div>
                    <div className={styles.feedbackCard}>
                      <div className={styles.feedbackText}>Pronunciation: {currentPartData.pronunciationFeedback}</div>
                    </div>
                  </>
                )}

                {activeFeedbackTab === 'vocab' && (
                  <>
                    <div className={styles.feedbackCard}>
                      <div className={styles.feedbackText}>{currentPartData.vocabFeedback}</div>
                    </div>
                  </>
                )}
                
                {activeFeedbackTab === 'coherence' && (
                  <>
                    <div className={styles.feedbackCard}>
                      <div className={styles.feedbackText}>{currentPartData.coherenceFeedback}</div>
                    </div>
                    <div className={styles.feedbackCard}>
                      <div className={styles.feedbackText}>Fluency: {currentPartData.fluencyFeedback}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actionRow}>
          <button className={styles.backBtn} onClick={handleBackToTests}>Back to tests</button>
          <button className={styles.tryAgainBtn} onClick={handleTryAgain}>Try again</button>
        </div>

      </div>
    </div>
  );
}
