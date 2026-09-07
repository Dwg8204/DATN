import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import InstructionBlock from '../../../components/common/InstructionBlock';
import MultipleChoice from '../../../components/common/MultipleChoice';
import { PART1_QUESTIONS as MOCK_QUESTIONS } from '../data/part1MockData';
import { getAdminGrammarPart } from '../utils/adminGrammarTestAdapter';
import { getGrammarVocabAnswers, saveGrammarVocabAnswers, startGrammarVocabSession } from '../utils/grammarVocabSessionStorage';
import styles from './Part1GrammarPage.module.css';
import RichTextContent from '../../../components/common/RichTextContent';



export default function Part1GrammarPage() {
  const { skill = 'grammar-vocab' } = useParams(); 
  const part = 'part1';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const testId = searchParams.get('testId') || '1';
  const questions = getAdminGrammarPart(testId, part) || MOCK_QUESTIONS;
  const isFullTest = searchParams.get('isFull') === 'true';
  startGrammarVocabSession(testId, isFullTest ? 'full' : 'part1');

  // Format dynamic titles
  const formattedPart = part ? part.replace(/([a-zA-Z]+)(\d+)/, (m, p1, p2) => `${p1.charAt(0).toUpperCase() + p1.slice(1)} ${p2}`) : 'Part 1';
  const formattedSkill = skill === 'grammar-vocab'
    ? 'Grammar & Vocabulary'
    : skill.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const [currentPage, setCurrentPage] = useState(1);
  const [answers, setAnswers] = useState(() => getGrammarVocabAnswers('part1'));
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  useEffect(() => {
    saveGrammarVocabAnswers('part1', answers);
  }, [answers]);

  const itemsPerPage = 3;
  const totalPages = Math.ceil(questions.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentQuestions = questions.slice(startIndex, startIndex + itemsPerPage);
  const currentPageQuestionIds = currentQuestions.map(q => q.id);

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

  const handleSubmit = () => {
    setShowSubmitModal(true);
  };

  const handleConfirmSubmit = () => {
    setShowSubmitModal(false);
    if (isFullTest) {
      // Logic for GrammarVocab: Part 1 -> Part 2
      if (part === 'part1') {
        navigate(`/${skill}/test/part2?testId=${testId}&isFull=true`);
      } else {
        navigate(`/${skill}/result?testId=${testId}&isFull=true&part=2`);
      }
    } else {
      navigate(`/${skill}/result?testId=${testId}&isFull=false&part=1`);
    }
  };

  const handleCloseSubmit = () => {
    setShowSubmitModal(false);
  };

  const getPageOfQuestion = (questionId) => {
    const index = questions.findIndex(q => q.id === questionId);
    return Math.floor(index / itemsPerPage) + 1;
  };

  const submitLabel = (isFullTest && part === 'part1') ? 'Next Part' : 'Submit';

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <div className={styles.headerBlock}>
          <div className={styles.partTitle}>{formattedPart}</div>
          <div className={styles.skillTitle}>{formattedSkill}</div>
        </div>

          <InstructionBlock title={`Questions ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, questions.length)}`}>
          Choose the correct letter, A, B or C.
        </InstructionBlock>

        <div className={styles.questionsContainer}>
          {currentQuestions.map(q => (
            <div key={q.id} className={styles.questionItem}>
              <div className={styles.questionHeader}>
                <div className={styles.questionNumberBox}>
                  <span className={styles.questionNumber}>{q.id}</span>
                </div>
                <RichTextContent className={styles.questionText} value={q.text}/>
              </div>
              <MultipleChoice
                name={`grammar-question-${q.id}`}
                options={q.options}
                value={answers[q.id]}
                onChange={(optionIndex) => handleOptionSelect(q.id, optionIndex)}
              />
            </div>
          ))}
        </div>
      </div>

      <TestFooter 
        partLabel={formattedPart} 
        questions={questions}
        answeredIds={Object.keys(answers)}
        currentPageQuestionIds={currentPageQuestionIds}
        onQuestionClick={(qId) => setCurrentPage(getPageOfQuestion(qId))}
        onPrevClick={handlePrev}
        onNextClick={handleNext}
        onSubmitClick={handleSubmit}
        submitLabel={submitLabel}
        hasPrev={currentPage > 1}
        hasNext={currentPage < totalPages}
      />
      <SubmitModal 
        isOpen={showSubmitModal} 
        onBack={handleCloseSubmit} 
        onNext={handleConfirmSubmit} 
      />
    </div>
  );
}
