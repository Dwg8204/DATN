import AnswerExplanation from '../../../components/common/AnswerExplanation';
import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import { getAllAnswers } from '../utils/listeningSessionStorage';
import { getListeningTestParts } from '../services/listeningTestRepository';
import AudioPlayer from '../../../components/shared/AudioPlayer/AudioPlayer';
import styles from './ListeningDetailResultPage.module.css';
import RichTextContent from '../../../components/common/RichTextContent';

function getStatus(answer, correctAnswer) {
  if (answer === undefined || answer === null) return 'skipped';
  return answer === correctAnswer ? 'correct' : 'wrong';
}

function StatusBadge({ status }) {
  const labels = { correct: 'Correct', wrong: 'Incorrect', skipped: 'Skipped' };
  return <span className={`${styles.statusBadge} ${styles[status]}`}>{labels[status]}</span>;
}

export default function ListeningDetailResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const testId = searchParams.get('testId') || '1';
  const initialPart = parseInt(searchParams.get('part'), 10) || 1;
  const isFullTest = searchParams.get('isFull') === 'true';
  const historyId = searchParams.get('historyId');
  const history = useMemo(() => { try { return JSON.parse(localStorage.getItem(`history_data_${historyId}`)); } catch { return null; } }, [historyId]);
  const { part1: PART1_QUESTIONS, part2: PART2_DATA, part3: PART3_DATA, part4: PART4_QUESTIONS } = useMemo(() => history?.testSnapshot || getListeningTestParts(testId), [testId, history]);

  const [activePart, setActivePart] = useState(initialPart);
  const [currentPage, setCurrentPage] = useState(1);

  const allAnswers = useMemo(() => history?.allAnswers ? { part1: history.allAnswers.p1Raw, part2: history.allAnswers.p2Raw, part3: history.allAnswers.p3Raw, part4: history.allAnswers.p4Raw } : getAllAnswers() || {}, [history]);

  const changePart = (partNum) => {
    setActivePart(partNum);
    setCurrentPage(1);
  };

  const handleNext = () => {
    if (activePart === 1 && currentPage < PART1_QUESTIONS.length) {
      setCurrentPage(prev => prev + 1);
    } else if (activePart === 4 && currentPage < PART4_QUESTIONS.length) {
      setCurrentPage(prev => prev + 1);
    } else if (isFullTest && activePart < 4) {
      changePart(activePart + 1);
    }
  };

  const handlePrev = () => {
    if (activePart === 1 && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    } else if (activePart === 4 && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    } else if (isFullTest && activePart > 1) {
      changePart(activePart - 1);
      if (activePart - 1 === 1) {
        setCurrentPage(PART1_QUESTIONS.length);
      } else if (activePart - 1 === 4) {
        setCurrentPage(PART4_QUESTIONS.length);
      }
    }
  };

  const handleQuestionClick = (qId) => {
    if (activePart === 1) {
      setCurrentPage(qId);
    } else if (activePart === 4) {
      const mainIdx = PART4_QUESTIONS.findIndex(mainQ => mainQ.subQuestions.some(sq => sq.id === qId));
      if (mainIdx !== -1) {
        setCurrentPage(mainIdx + 1);
      }
    }
  };

  const renderPart1 = () => {
    const question = PART1_QUESTIONS[currentPage - 1];
    const rawAnswers = allAnswers.part1 || {};
    const userAnswer = rawAnswers[String(question.id)];
    const status = getStatus(userAnswer, question.answer);

    return (
      <div className={styles.contentRow}>
        {question.script && <div className={styles.scriptBox}>
          <div className={styles.scriptTitle}>Script</div>
          <div className={styles.scriptText}>{question.script}</div>
        </div>}

        <div className={styles.qaBox}>
          <article className={styles.questionCard}>
            <div className={styles.questionHeading}>
              <span className={styles.questionNumber}>{question.id}</span>
              <RichTextContent value={question.text}/>
              <StatusBadge status={status} />
            </div>

            <div className={styles.optionsList}>
              {question.options.map((opt, idx) => {
                const isUserAnswer = userAnswer === idx;
                const isCorrectAnswer = question.answer === idx;
                return (
                  <div
                    key={idx}
                    aria-label={`${opt}${isCorrectAnswer ? ', correct' : isUserAnswer ? ', selected, incorrect' : ''}`}
                    className={`${styles.optionRow} ${isCorrectAnswer ? styles.correctOption : ''} ${isUserAnswer && !isCorrectAnswer ? styles.wrongOption : ''}`}
                  >
                    <span className={styles.optionLetter}>{String.fromCharCode(65 + idx)}</span>
                    <span>{opt}</span>

                  </div>
                );
              })}
            </div>

            <AnswerExplanation text={question.explanation} />
          </article>
        </div>
      </div>
    );
  };

  const renderPart2 = () => {
    const rawAnswers = allAnswers.part2 || {};
    return (
      <div className={styles.contentRow}>
        {PART2_DATA.scripts?.length && <div className={styles.scriptBox}>
          <div className={styles.scriptTitle}>Script</div>
          <div className={styles.scriptText}>
            {(PART2_DATA.scripts || []).map((script, i) => (
              <div key={i} style={{ marginBottom: '16px' }}>{script}</div>
            ))}
          </div>
        </div>}

        <div className={styles.qaBox}>
          <div className={styles.matchingList}>
            {PART2_DATA.speakers.map((speaker, idx) => {
              const userAnswerText = rawAnswers[String(idx)];
              const correctAnswerText = PART2_DATA.answers[idx];
              const status = getStatus(userAnswerText, correctAnswerText);

              return (
                <article key={idx} className={styles.matchingItem}>
                  <div className={styles.matchingRow}>
                    <span className={styles.targetWord}>{speaker} =</span>
                    <div className={`${styles.answerField} ${styles[`${status}Field`]}`}>
                      {userAnswerText || 'Skipped'}
                    </div>
                    <StatusBadge status={status} />
                  </div>

                  {status !== 'correct' && <div className={styles.correctField} aria-label="Correct answer"><strong>{correctAnswerText}</strong></div>}

                  <AnswerExplanation text={PART2_DATA.explanations?.[`speaker-${idx}`]} />
                </article>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderPart3 = () => {
    const rawAnswers = allAnswers.part3 || {};
    return (
      <div className={styles.contentRow}>
        {PART3_DATA.script && <div className={styles.scriptBox}>
          <div className={styles.scriptTitle}>Script</div>
          <div className={styles.scriptText}>{PART3_DATA.script}</div>
        </div>}

        <div className={styles.qaBox}>
          <div className={styles.matchingList}>
            {PART3_DATA.statements.map((stmt) => {
              const userAnswerText = rawAnswers[stmt.id];
              const correctAnswerText = PART3_DATA.answers[stmt.id];
              const status = getStatus(userAnswerText, correctAnswerText);

              return (
                <article key={stmt.id} className={styles.matchingItem}>
                  <div className={styles.matchingRow}>
                    <span className={styles.targetWord} style={{ fontWeight: 'normal' }}>{stmt.text}</span>
                    <div className={`${styles.answerField} ${styles[`${status}Field`]}`}>
                      {userAnswerText || 'Skipped'}
                    </div>
                    <StatusBadge status={status} />
                  </div>

                  {status !== 'correct' && <div className={styles.correctField} aria-label="Correct answer"><strong>{correctAnswerText}</strong></div>}

                  <AnswerExplanation text={stmt.explanation} />
                </article>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderPart4 = () => {
    const rawAnswers = allAnswers.part4 || {};
    const mainQ = PART4_QUESTIONS[currentPage - 1];

    return (
      <div className={styles.contentRow}>
        {mainQ.script && <div className={styles.scriptBox}>
          <div className={styles.scriptTitle}>Script (Question {mainQ.id})</div>
          <div className={styles.scriptText}>{mainQ.script}</div>
        </div>}

        <div className={styles.qaBox}>
          {mainQ.subQuestions.map((question) => {
            const userAnswer = rawAnswers[String(question.id)];
            const status = getStatus(userAnswer, question.answer);

            return (
              <article key={question.id} className={styles.questionCard}>
                <div className={styles.questionHeading}>
                  <span className={styles.questionNumber} style={{ width: 'fit-content', padding: '0 8px' }}>{question.id}</span>
                  <RichTextContent value={question.text}/>
                  <StatusBadge status={status} />
                </div>

                <div className={styles.optionsList}>
                  {question.options.map((opt, idx) => {
                    const isUserAnswer = userAnswer === idx;
                    const isCorrectAnswer = question.answer === idx;
                    return (
                      <div
                        key={idx}
                        aria-label={`${opt}${isCorrectAnswer ? ', correct' : isUserAnswer ? ', selected, incorrect' : ''}`}
                        className={`${styles.optionRow} ${isCorrectAnswer ? styles.correctOption : ''} ${isUserAnswer && !isCorrectAnswer ? styles.wrongOption : ''}`}
                      >
                          <span className={styles.optionLetter}>{String.fromCharCode(65 + idx)}</span>
                          <span>{opt}</span>

                      </div>
                    );
                  })}
                </div>

                <AnswerExplanation text={question.explanation} />
              </article>
            );
          })}
        </div>
      </div>
    );
  };

  // Footer data calculations
  let footerQuestions = [];
  let currentQuestionIds = [];
  let answeredIds = [];
  let audioUrl = null;

  if (activePart === 1) {
    footerQuestions = PART1_QUESTIONS.map(q => ({ id: q.id }));
    currentQuestionIds = [footerQuestions[currentPage - 1].id];
    answeredIds = Object.keys(allAnswers.part1 || {});
    audioUrl = PART1_QUESTIONS[currentPage - 1].audioUrl;
  } else if (activePart === 2) {
    footerQuestions = Array.from({ length: 4 }, (_, i) => ({ id: `14.${i + 1}` }));
    currentQuestionIds = footerQuestions.map(q => q.id);
    answeredIds = Object.keys(allAnswers.part2 || {}).map(idx => `14.${parseInt(idx) + 1}`);
    audioUrl = PART2_DATA.audioUrl;
  } else if (activePart === 3) {
    footerQuestions = PART3_DATA.statements.map(s => ({ id: s.id }));
    currentQuestionIds = footerQuestions.map(q => q.id);
    answeredIds = Object.keys(allAnswers.part3 || {});
    audioUrl = PART3_DATA.audioUrl;
  } else if (activePart === 4) {
    footerQuestions = PART4_QUESTIONS.flatMap(q => q.subQuestions.map(sq => ({ id: sq.id })));
    currentQuestionIds = PART4_QUESTIONS[currentPage - 1].subQuestions.map(sq => sq.id);
    answeredIds = Object.keys(allAnswers.part4 || {});
    audioUrl = PART4_QUESTIONS[currentPage - 1].audioUrl;
  }

  const renderContent = () => {
    switch (activePart) {
      case 1: return renderPart1();
      case 2: return renderPart2();
      case 3: return renderPart3();
      case 4: return renderPart4();
      default: return null;
    }
  };

  const getSectionTitle = () => {
    if (activePart === 1) {
      return `Question ${currentPage}`;
    }
    if (activePart === 2) return `Questions 14.1-14.4`;
    if (activePart === 3) return `Questions 15a-15d`;
    if (activePart === 4) return `Question ${PART4_QUESTIONS[currentPage - 1].id}`;
  };

  const getSectionSubtitle = () => {
    if (activePart === 1) return 'Information recognition';
    if (activePart === 2) return 'Information matching';
    if (activePart === 3) return 'Inference/discussion';
    if (activePart === 4) return 'Identifying opinions';
  };

  return (
    <div className={styles.page}>

      <main className={styles.content}>
        {isFullTest && (
          <div className={styles.partTabs}>
            {[1, 2, 3, 4].map(num => (
              <button
                key={num}
                className={activePart === num ? styles.activeTab : ''}
                onClick={() => changePart(num)}
              >
                Part {num}
              </button>
            ))}
          </div>
        )}

        <div className={styles.sectionHeader}>
          <strong>{getSectionTitle()}</strong>
          <span>{getSectionSubtitle()}</span>
        </div>

        {renderContent()}

        <div className={styles.audioBar}>
          {audioUrl && (
            <AudioPlayer src={audioUrl} compact={true} maxPlays={Infinity} />
          )}
        </div>
      </main>

      <TestFooter
        partLabel={`Part ${activePart}`}
        questions={footerQuestions}
        answeredIds={answeredIds}
        currentPageQuestionIds={currentQuestionIds}
        onQuestionClick={handleQuestionClick}
        onPrevClick={handlePrev}
        onNextClick={handleNext}
        onSubmitClick={() => navigate('/listening/tests')}
        submitLabel="Take another test"
        hasPrev={(activePart === 1 && currentPage > 1) || (activePart === 4 && currentPage > 1) || (isFullTest && activePart > 1)}
        hasNext={(activePart === 1 && currentPage < PART1_QUESTIONS.length) || (activePart === 4 && currentPage < PART4_QUESTIONS.length) || (isFullTest && activePart < 4)}
      />
    </div>
  );
}
