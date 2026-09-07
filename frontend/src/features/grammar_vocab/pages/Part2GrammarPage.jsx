import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import AnswerSelect from '../../../components/common/AnswerSelect';
import InstructionBlock from '../../../components/common/InstructionBlock';
import { PART2_WORD_SETS } from '../data/part2MockData';
import { getAdminGrammarPart } from '../utils/adminGrammarTestAdapter';
import { getGrammarVocabAnswers, saveGrammarVocabAnswers, startGrammarVocabSession } from '../utils/grammarVocabSessionStorage';
import styles from './Part2GrammarPage.module.css';
import RichTextContent from '../../../components/common/RichTextContent';

export default function Part2GrammarPage() {
  const { skill = 'grammar-vocab' } = useParams(); 
  const part = 'part2';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const testId = searchParams.get('testId') || '1';
  const wordSets = getAdminGrammarPart(testId, part) || PART2_WORD_SETS;
  const isFullTest = searchParams.get('isFull') === 'true';
  startGrammarVocabSession(testId, isFullTest ? 'full' : 'part2');

  const formattedPart = part ? part.replace(/([a-zA-Z]+)(\d+)/, (m, p1, p2) => `${p1.charAt(0).toUpperCase() + p1.slice(1)} ${p2}`) : 'Part 2';
  const formattedSkill = skill === 'grammar-vocab'
    ? 'Grammar & Vocabulary'
    : skill.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const [currentPage, setCurrentPage] = useState(1);
  const [answers, setAnswers] = useState(() => getGrammarVocabAnswers('part2'));
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  useEffect(() => {
    saveGrammarVocabAnswers('part2', answers);
  }, [answers]);

  const itemsPerPage = 2; // 2 word sets per page
  const totalPages = Math.ceil(wordSets.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentSets = wordSets.slice(startIndex, startIndex + itemsPerPage);
  
  // Extract all individual questions to pass to Footer
  const allQuestions = wordSets.flatMap(set => set.targetWords.map(tw => ({ id: tw.id })));
  const currentPageQuestionIds = currentSets.flatMap(set => set.targetWords.map(tw => tw.id));

  const handleOptionSelect = (questionId, optionLabel) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionLabel
    }));
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(p => p + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      setCurrentPage(p => p - 1);
    }
  };

  const handleSubmit = () => {
    setShowSubmitModal(true);
  };

  const handleConfirmSubmit = () => {
    setShowSubmitModal(false);
    navigate(`/${skill}/result?testId=${testId}&isFull=${isFullTest}&part=2`);
  };

  const handleCloseSubmit = () => {
    setShowSubmitModal(false);
  };

  const getPageOfQuestion = (questionId) => {
    const setIndex = wordSets.findIndex(set => set.targetWords.some(tw => tw.id === questionId));
    return Math.floor(setIndex / itemsPerPage) + 1;
  };

  const submitLabel = (isFullTest && part === 'part2') ? 'Submit' : (isFullTest ? 'Next Part' : 'Submit');

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <div className={styles.headerBlock}>
          <div className={styles.partTitle}>{formattedPart}</div>
          <div className={styles.skillTitle}>{formattedSkill}</div>
        </div>

        {currentSets.map((wordSet) => (
          <div key={wordSet.setId} className={styles.wordSetBlock}>
            <InstructionBlock title={`Questions ${wordSet.questionRange}`}>
              <RichTextContent value={wordSet.instruction}/>
            </InstructionBlock>

            <div className={styles.matchingArea}>
              <div className={styles.targetWordsColumn}>
                {wordSet.targetWords.map((tw) => {
                  const selectedLabel = answers[tw.id];

                  return (
                    <div key={tw.id} className={styles.matchingRow}>
                      <div className={styles.targetWordText}>{tw.word} = </div>
                      
                      <div className={styles.dropdownContainer}>
                        <AnswerSelect
                          value={selectedLabel || ''}
                          onChange={(event) => handleOptionSelect(tw.id, event.target.value)}
                          placeholder={`Question ${tw.id}`}
                          ariaLabel={`Answer for question ${tw.id}`}
                          options={wordSet.options.map((option) => ({
                            value: option.label,
                            label: `${option.label}. ${option.text}`,
                          }))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <TestFooter 
        partLabel={formattedPart} 
        questions={allQuestions}
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
