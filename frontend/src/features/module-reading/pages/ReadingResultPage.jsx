import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { calculateScore } from '../services/gradingService';
import { updateHistoryEntry } from '../../../utils/historyStorage';
import styles from './ReadingResultPage.module.css';
import {loadReadingTest} from '../services/readingTestRepository';

function formatTestingTime(seconds) {
  if (seconds === undefined || seconds === null) return '00:32:15';
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${remainder}`;
}

function AnswerStatusIcon({ status }) {
  if (status === 'skipped') {
    return <span className={styles.skippedIcon}>—</span>;
  }

  if (status === 'correct') {
    return (
      <svg className={styles.statusIcon} viewBox="0 0 24 24" aria-label="Correct answer">
        <path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg className={`${styles.statusIcon} ${styles.wrongIcon}`} viewBox="0 0 24 24" aria-label="Incorrect answer">
      <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function ScoreRing({ percentage, size = 'large', children }) {
  return (
    <div
      className={`${styles.scoreRing} ${size === 'small' ? styles.scoreRingSmall : ''}`}
      style={{ '--score': `${percentage * 3.6}deg` }}
    >
      <div className={styles.scoreRingInner}>{children}</div>
    </div>
  );
}

const ReadingResultPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const sessionDataString = localStorage.getItem(sessionId);
        if (!sessionDataString) {
          navigate('/reading/tests');
          return;
        }

        const sessionData = JSON.parse(sessionDataString);
        
        const testData = sessionData.testSnapshot || await loadReadingTest(sessionData.testId);

        const gradedResults = calculateScore(sessionData.answers, testData, sessionData.mode || 'full');
        setResults({ 
          ...gradedResults, 
          timeSpent: sessionData.timeSpent,
          userAnswers: sessionData.answers,
          mode: sessionData.mode || 'full',
          historyId: sessionData.historyId
        });
      } catch (error) {
        console.error("Error loading results", error);
        navigate('/reading/tests');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [sessionId, navigate]);

  const stats = useMemo(() => {
    if (!results) return null;

    const percentage = Math.round((results.overall.score / results.overall.total) * 100);

    const questions = [
      ...results.part1.details.map((d, index) => ({ id: index + 1, answer: d.userAnswer, isCorrect: d.isCorrect })),
      ...results.part2.details.map((d, index) => ({ id: index + 6, answer: d.userAnswer, isCorrect: d.isCorrect })),
      ...results.part3.details.map((d, index) => ({ id: index + 11, answer: d.userAnswer, isCorrect: d.isCorrect })),
      ...results.part4.details.map((d, index) => ({ id: index + 18, answer: d.userAnswer, isCorrect: d.isCorrect })),
    ].map(item => {
      const isSkipped = !item.answer || item.answer === '' || item.answer === '(No answer)';
      return {
        id: item.id,
        answer: isSkipped ? null : item.answer,
        status: isSkipped ? 'skipped' : (item.isCorrect ? 'correct' : 'wrong')
      };
    });

    const correct = questions.filter((item) => item.status === 'correct').length;
    const skipped = questions.filter((item) => item.status === 'skipped').length;
    const wrong = questions.length - correct - skipped;

    const groupStats = [
      { label: 'Sentence\nComprehension', correct: results.part1.score, total: results.part1.total },
      { label: 'Text\nCohesion', correct: results.part2.score, total: results.part2.total },
      { label: 'Opinion\nMatching', correct: results.part3.score, total: results.part3.total },
      { label: 'Long Text\nComprehension', correct: results.part4.score, total: results.part4.total },
    ].map(stat => ({
      ...stat,
      percentage: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0
    }));

    const resultStats = {
      percentage,
      questions,
      correct,
      skipped,
      wrong,
      groupStats,
      timeSpent: results.timeSpent,
      mode: results.mode
    };

    if (results.historyId) {
      updateHistoryEntry(results.historyId, {
        correct,
        wrong,
        skipped,
        total: questions.length,
        timeSpent: formatTestingTime(results.timeSpent),
        partScores: [
          results.mode === 'full' || results.mode === 'part1' ? { label: 'Part 1', correct: results.part1.score, total: results.part1.total } : null,
          results.mode === 'full' || results.mode === 'part2' ? { label: 'Part 2', correct: results.part2.score, total: results.part2.total } : null,
          results.mode === 'full' || results.mode === 'part3' ? { label: 'Part 3', correct: results.part3.score, total: results.part3.total } : null,
          results.mode === 'full' || results.mode === 'part4' ? { label: 'Part 4', correct: results.part4.score, total: results.part4.total } : null,
        ].filter(Boolean)
      });
    }

    return resultStats;
  }, [results]);

  const getFeedbackText = () => {
    if (!results) return '';
    const p1Pct = results.part1.total > 0 ? (results.part1.score / results.part1.total) : 0;
    const p2Pct = results.part2.total > 0 ? (results.part2.score / results.part2.total) : 0;
    const p3Pct = results.part3.total > 0 ? (results.part3.score / results.part3.total) : 0;
    const p4Pct = results.part4.total > 0 ? (results.part4.score / results.part4.total) : 0;
    
    let feedback = "Chúc mừng bạn đã hoàn thành bài thi! ";
    
    const parts = [
      { part: 1, name: "Hoàn thành câu (Part 1)", pct: p1Pct, scoreStr: `${results.part1.score}/${results.part1.total}` },
      { part: 2, name: "Mạch lạc văn bản (Part 2)", pct: p2Pct, scoreStr: `${results.part2.score}/${results.part2.total}` },
      { part: 3, name: "Ghép ý kiến (Part 3)", pct: p3Pct, scoreStr: `${results.part3.score}/${results.part3.total}` },
      { part: 4, name: "Ghép tiêu đề (Part 4)", pct: p4Pct, scoreStr: `${results.part4.score}/${results.part4.total}` }
    ];
    
    parts.sort((a, b) => b.pct - a.pct);
    const best = parts[0];
    const worst = parts[parts.length - 1];
    
    if (best.pct >= 0.7) {
      feedback += `Bạn có kỹ năng ${best.name.replace(/\s*\(Part\s*\d+\)/, '')} rất xuất sắc. `;
    } else {
      feedback += "Bạn đã hoàn thành tốt các câu hỏi trong bài làm của mình. ";
    }
    
    if (worst.pct < 0.6) {
      feedback += `Tuy nhiên, tỷ lệ đúng ở phần ${worst.name.replace(/\s*\(Part\s*\d+\)/, '')} (${worst.name.split(' ').pop()}) đang khá thấp (${worst.scoreStr}). Điều này cho thấy bạn cần ôn tập thêm về `;
      if (worst.part === 1) {
        feedback += "ngữ pháp cơ bản, từ vựng theo ngữ cảnh và các cấu trúc liên kết câu đơn giản.";
      } else if (worst.part === 2) {
        feedback += "cách sử dụng các từ nối (linking words), đại từ thay thế và rèn luyện tư duy logic để sắp xếp các câu thành một đoạn văn hoàn chỉnh.";
      } else if (worst.part === 3) {
        feedback += "kỹ năng đọc lướt (scanning) để định vị nhanh thông tin chi tiết và nhận diện các từ đồng nghĩa (synonyms) của người nói.";
      } else {
        feedback += "cách nắm bắt ý chính (topic sentence) của từng đoạn văn dài và phân tích các phương án gây nhiễu.";
      }
    } else {
      feedback += "Các kỹ năng của bạn khá đồng đều. Hãy tiếp tục luyện tập để đạt kết quả cao hơn nữa!";
    }
    
    return feedback;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C82323]"></div>
      </div>
    );
  }

  if (!results || !stats) return null;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <section className={styles.summarySection}>
          <div className={styles.bandCard}>
            <div>
              <h2>CEFR Level</h2>
              <p>Your current CEFR level</p>
            </div>
            <div className={styles.bandValue} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <strong style={{ fontSize: '48px', color: '#a11d33', lineHeight: '1.2' }}>{results.overall.cefr}</strong>
              <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal', lineHeight: '1.5' }}>
                Score: {results.overall.score}/{results.overall.total}
              </span>
            </div>
          </div>

          <div className={styles.resultCard}>
            <h2>Result</h2>
            <div className={styles.resultOverview}>
              <ScoreRing percentage={stats.percentage}>{stats.percentage}%</ScoreRing>
              <div className={styles.resultStats}>
                <div><strong>Testing time</strong><strong>{formatTestingTime(results.timeSpent)}</strong></div>
                <div><strong className={styles.correctText}>Correct</strong><span>{stats.correct} sections</span></div>
                <div><strong className={styles.wrongText}>Wrong</strong><span>{stats.wrong} sections</span></div>
                <div><strong className={styles.skipText}>Skip</strong><span>{stats.skipped} sections</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <h2>Result</h2>
          <div className={styles.answerGrid}>
            {stats.questions.map((item) => (
              <div className={styles.answerRow} key={item.id}>
                <strong>{item.id}</strong>
                <span className={styles.answerText}>{item.answer ?? '--'}</span>
                <AnswerStatusIcon status={item.status} />
              </div>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <h2>Feedback</h2>
          <p className={styles.feedback}>{getFeedbackText()}</p>
        </section>

        <section className={styles.panel}>
          <h2>Statistics</h2>
          <div className={styles.statistics}>
            {stats.groupStats.map((stat) => (
              <div className={styles.statisticItem} key={stat.label}>
                <ScoreRing percentage={stat.percentage} size="small">
                  <span>{stat.correct}/{stat.total}</span>
                </ScoreRing>
                <div>{stat.label.split('\n').map((line) => <span key={line}>{line}<br /></span>)}</div>
              </div>
            ))}
          </div>
        </section>

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            onClick={() => navigate(`/reading/review/${sessionId}`)}
          >
            View detail result
          </button>
          <button className={styles.secondaryButton} onClick={() => navigate('/reading/tests')}>
            Take another test
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReadingResultPage;
