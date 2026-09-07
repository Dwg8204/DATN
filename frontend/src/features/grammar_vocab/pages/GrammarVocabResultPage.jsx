import { getAdminGrammarPart } from '../utils/adminGrammarTestAdapter';
import { useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PART1_QUESTIONS as MOCK_QUESTIONS } from '../data/part1MockData';
import { PART2_WORD_SETS as MOCK_SETS } from '../data/part2MockData';
import { getAllGrammarVocabAnswers, getGrammarVocabSession } from '../utils/grammarVocabSessionStorage';
import { saveHistoryEntry } from '../../../utils/historyStorage';
import styles from './GrammarVocabResultPage.module.css';

function getCefrLevel(percentage) {
  if (percentage >= 90) return 'C1';
  if (percentage >= 75) return 'B2';
  if (percentage >= 55) return 'B1';
  if (percentage >= 35) return 'A2';
  return 'A1';
}

function formatDuration(startTime) {
  const seconds = startTime ? Math.max(0, Math.floor((Date.now() - startTime) / 1000)) : 0;
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

export default function GrammarVocabResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFullTest = searchParams.get('isFull') === 'true';
  const selectedPart = searchParams.get('part') || '1';
  const timedOut = searchParams.get('timedOut') === 'true';
  const testId = searchParams.get('testId') || '1';
  const historyIdParam = searchParams.get('historyId');

  const result = useMemo(() => {
    if (historyIdParam) {
      const stored = localStorage.getItem(`history_data_${historyIdParam}`);
      if (stored) return JSON.parse(stored);
    }

    const PART1_QUESTIONS = getAdminGrammarPart(testId, 'part1') || MOCK_QUESTIONS;
    const PART2_WORD_SETS = getAdminGrammarPart(testId, 'part2') || MOCK_SETS;
    const answers = getAllGrammarVocabAnswers();
    const { startTime } = getGrammarVocabSession();
    const part1 = PART1_QUESTIONS.map((question) => {
      const rawAnswer = answers.part1[String(question.id)];
      return {
        id: question.id,
        answer: rawAnswer === undefined ? null : String.fromCharCode(65 + Number(rawAnswer)),
        status: rawAnswer === undefined ? 'skipped' : Number(rawAnswer) === question.correctAnswer ? 'correct' : 'wrong',
        group: 'Grammar',
      };
    });
    const part2 = PART2_WORD_SETS.flatMap((set) => set.targetWords).map((question) => {
      const answer = answers.part2[String(question.id)];
      return {
        id: question.id,
        answer: answer ?? null,
        status: answer === undefined ? 'skipped' : answer === question.correctAnswer ? 'correct' : 'wrong',
        group: 'Vocabulary',
      };
    });
    const questions = isFullTest ? [...part1, ...part2] : selectedPart === '2' ? part2 : part1;
    const correct = questions.filter((item) => item.status === 'correct').length;
    const skipped = questions.filter((item) => item.status === 'skipped').length;
    const groupStats = [
      { label: 'Grammar', items: part1 },
      { label: 'Vocabulary\n(Synonyms)', items: part2 },
    ]
      .filter(({ label }) => isFullTest || (selectedPart === '1' ? label === 'Grammar' : label.startsWith('Vocabulary')))
      .map(({ label, items }) => {
        const groupCorrect = items.filter((item) => item.status === 'correct').length;
        return {
          label,
          correct: groupCorrect,
          total: items.length,
          percentage: items.length ? Math.round((groupCorrect / items.length) * 100) : 0,
        };
      });

    return {
      questions,
      groupStats,
      correct,
      skipped,
      wrong: questions.length - correct - skipped,
      percentage: questions.length ? Math.round((correct / questions.length) * 100) : 0,
      duration: formatDuration(startTime),
      testSnapshot: { part1: PART1_QUESTIONS, part2: PART2_WORD_SETS },
      rawAnswers: answers
    };
  }, [isFullTest, selectedPart, historyIdParam, testId]);

  const historySaved = useRef(false);
  const reviewHistoryId = useRef(historyIdParam);

  useEffect(() => {
    if (historyIdParam) return;
    if (result && !historySaved.current) {
      historySaved.current = true;
      const newHistoryId = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      localStorage.setItem(`history_data_${newHistoryId}`, JSON.stringify(result));
      reviewHistoryId.current = newHistoryId;

      saveHistoryEntry({
        id: newHistoryId,
        skill: 'grammar',
        testId: String(testId),
        testName: `Aptis Grammar & Vocab Test ${testId}`,
        mode: isFullTest ? 'full' : `part${selectedPart}`,
        submittedAt: new Date().toISOString(),
        timeSpent: result.duration,
        cefrLevel: getCefrLevel(result.percentage),
        correct: result.correct,
        wrong: result.wrong,
        skipped: result.skipped,
        total: result.correct + result.wrong + result.skipped,
        partScores: [
          isFullTest || selectedPart === '1' ? { label: 'Part 1 (Grammar)', correct: result.groupStats.find(g => g.label === 'Grammar')?.correct || 0, total: result.groupStats.find(g => g.label === 'Grammar')?.total || 0 } : null,
          isFullTest || selectedPart === '2' ? { label: 'Part 2 (Vocabulary)', correct: result.groupStats.find(g => g.label.startsWith('Vocabulary'))?.correct || 0, total: result.groupStats.find(g => g.label.startsWith('Vocabulary'))?.total || 0 } : null,
        ],
        reviewUrl: `/grammar-vocab/result?testId=${testId}&isFull=${isFullTest}&part=${selectedPart}&historyId=${newHistoryId}`
      });
    }
  }, [result, testId, isFullTest, selectedPart, historyIdParam]);

  const feedback = result.percentage >= 80
    ? 'You performed very well and demonstrated a strong understanding of the grammar and vocabulary tested. Keep practising to maintain your accuracy and confidence.'
    : result.percentage >= 50
      ? 'You understood many of the tested grammar and vocabulary points. Review your incorrect answers and practise similar question types to improve your accuracy.'
      : 'Continue building your grammar and vocabulary foundations. Review the questions you missed, learn the relevant rules and word meanings, and then try another practice test.';

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {timedOut && (
          <div className={styles.notice}>Time expired. Your saved answers were submitted automatically.</div>
        )}

        <section className={styles.summarySection}>
          <div className={styles.bandCard}>
            <div>
              <h2>Band Score</h2>
              <p>Your current band score</p>
            </div>
            <div className={styles.bandValue}>
              <strong>{result.correct}/</strong><span>{result.questions.length}</span>
            </div>
          </div>

          <div className={styles.resultCard}>
            <h2>Result</h2>
            <div className={styles.resultOverview}>
              <ScoreRing percentage={result.percentage}>{result.percentage}%</ScoreRing>
              <div className={styles.resultStats}>
                <div><strong>Testing time</strong><strong>{result.duration}</strong></div>
                <div><strong className={styles.correctText}>Correct</strong><span>{result.correct} sections</span></div>
                <div><strong className={styles.wrongText}>Wrong</strong><span>{result.wrong} sections</span></div>
                <div><strong className={styles.skipText}>Skip</strong><span>{result.skipped} sections</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <h2>Result</h2>
          <div className={styles.answerGrid}>
            {result.questions.map((item) => (
              <div className={styles.answerRow} key={item.id}>
                <strong>{item.id}</strong>
                <span>{item.answer ?? '--'}</span>
                <AnswerStatusIcon status={item.status} />
              </div>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <h2>Feedback</h2>
          <p className={styles.feedback}>{feedback}</p>
        </section>

        <section className={styles.panel}>
          <h2>Statistics</h2>
          <div className={styles.statistics}>
            {result.groupStats.map((stat) => (
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
            onClick={() => navigate(`/grammar-vocab/result-detail?testId=${testId}&isFull=${isFullTest}&part=${selectedPart}${reviewHistoryId.current ? `&historyId=${reviewHistoryId.current}` : ''}`)}
          >
            View detail result
          </button>
          <button className={styles.secondaryButton} onClick={() => navigate('/grammar-vocab/tests')}>
            Take another test
          </button>
        </div>
      </div>
    </div>
  );
}
