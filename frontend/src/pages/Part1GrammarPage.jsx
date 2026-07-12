import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import TestFooter from '../components/layout/TestFooter';
import styles from './Part1GrammarPage.module.css';

const MOCK_QUESTIONS = [
  {
    id: 1,
    text: 'Participants in the Learner Persistence study were all drawn from the same',
    options: ['age group.', 'geographical area.', 'socio-economic level.'],
  },
  {
    id: 2,
    text: 'The study showed that when starting their course, older students were most concerned about',
    options: ['effects on their home life.', 'implications for their future career.', 'financial constraints.'],
  },
  {
    id: 3,
    text: 'What was the main reason given for students dropping out?',
    options: ['lack of time.', 'difficulty of the course.', 'personal health issues.'],
  },
  {
    id: 4,
    text: 'Most students found the support from tutors to be',
    options: ['very helpful.', 'somewhat helpful.', 'not helpful at all.'],
  },
  {
    id: 5,
    text: 'The university plans to introduce',
    options: ['more online courses.', 'higher tuition fees.', 'stricter attendance rules.'],
  },
  {
    id: 6,
    text: 'Which group of students showed the highest persistence?',
    options: ['part-time students.', 'full-time students.', 'international students.'],
  }
];

export default function Part1GrammarPage() {
  const { skill, part } = useParams(); // e.g., skill = 'grammar-vocab', part = 'part1'
  
  // Format dynamic titles
  const formattedPart = part ? part.replace(/([a-zA-Z]+)(\d+)/, (m, p1, p2) => `${p1.charAt(0).toUpperCase() + p1.slice(1)} ${p2}`) : 'Part 1';
  const formattedSkill = skill ? skill.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Grammar';

  const [currentPage, setCurrentPage] = useState(1);
  const [answers, setAnswers] = useState({});

  const itemsPerPage = 3;
  const totalPages = Math.ceil(MOCK_QUESTIONS.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentQuestions = MOCK_QUESTIONS.slice(startIndex, startIndex + itemsPerPage);

  const handleOptionSelect = (questionId, optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <div className={styles.headerBlock}>
          <div className={styles.partTitle}>{formattedPart}</div>
          <div className={styles.skillTitle}>{formattedSkill}</div>
        </div>

        <div className={styles.instructionBlock}>
          <span className={styles.instructionTitle}>
            Questions {startIndex + 1}-{Math.min(startIndex + itemsPerPage, MOCK_QUESTIONS.length)}<br />
          </span>
          <span className={styles.instructionText}>
            Choose the correct letter, A, B or C.
          </span>
        </div>

        <div className={styles.questionsContainer}>
          {currentQuestions.map(q => (
            <div key={q.id} className={styles.questionItem}>
              <div className={styles.questionHeader}>
                <div className={styles.questionNumberBox}>
                  <span className={styles.questionNumber}>{q.id}</span>
                </div>
                <div className={styles.questionText}>{q.text}</div>
              </div>
              <div className={styles.optionsList}>
                {q.options.map((opt, idx) => (
                  <div 
                    key={idx} 
                    className={styles.optionItem}
                    onClick={() => handleOptionSelect(q.id, idx)}
                  >
                    <div className={styles.radioWrap}>
                      <div className={`${styles.radioOuter} ${answers[q.id] === idx ? styles.radioOuterSelected : ''}`}></div>
                      {answers[q.id] === idx && <div className={styles.radioInner}></div>}
                    </div>
                    <div className={styles.optionText}>{opt}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <TestFooter 
        partLabel={formattedPart} 
        questionCount={totalPages} 
        activeQuestion={currentPage}
        onQuestionClick={(page) => setCurrentPage(page)}
        onPrevClick={handlePrev}
        onNextClick={handleNext}
        onSubmitClick={() => alert('Submit clicked!')}
      />
    </div>
  );
}
