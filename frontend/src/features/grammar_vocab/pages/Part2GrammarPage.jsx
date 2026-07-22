import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import { PART2_WORD_SETS } from '../data/part2MockData';
import { getGrammarVocabAnswers, saveGrammarVocabAnswers, startGrammarVocabSession } from '../utils/grammarVocabSessionStorage';
import styles from './Part2GrammarPage.module.css';

export default function Part2GrammarPage() {
  const { skill = 'grammar-vocab' } = useParams(); 
  const part = 'part2';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const testId = searchParams.get('testId') || '1';
  const isFullTest = searchParams.get('isFull') === 'true';
  startGrammarVocabSession(testId, isFullTest ? 'full' : 'part2');

  const formattedPart = part ? part.replace(/([a-zA-Z]+)(\d+)/, (m, p1, p2) => `${p1.charAt(0).toUpperCase() + p1.slice(1)} ${p2}`) : 'Part 2';
  const formattedSkill = skill ? skill.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Vocabulary';

  const [currentPage, setCurrentPage] = useState(1);
  const [answers, setAnswers] = useState(() => getGrammarVocabAnswers('part2'));
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const dropdownRef = useRef(null);

  useEffect(() => {
    saveGrammarVocabAnswers('part2', answers);
  }, [answers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const itemsPerPage = 2; // 2 word sets per page
  const totalPages = Math.ceil(PART2_WORD_SETS.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentSets = PART2_WORD_SETS.slice(startIndex, startIndex + itemsPerPage);
  
  // Extract all individual questions to pass to Footer
  const allQuestions = PART2_WORD_SETS.flatMap(set => set.targetWords.map(tw => ({ id: tw.id })));
  const currentPageQuestionIds = currentSets.flatMap(set => set.targetWords.map(tw => tw.id));

  const handleOptionSelect = (questionId, optionLabel) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionLabel
    }));
    setOpenDropdown(null);
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(p => p + 1);
      setOpenDropdown(null);
    }
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      setCurrentPage(p => p - 1);
      setOpenDropdown(null);
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
    const setIndex = PART2_WORD_SETS.findIndex(set => set.targetWords.some(tw => tw.id === questionId));
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
            <div className={styles.instructionBlock}>
              <span className={styles.instructionTitle}>Questions {wordSet.questionRange}<br /></span>
              <span className={styles.instructionText}>{wordSet.instruction}</span>
            </div>

            <div className={styles.matchingArea}>
              <div className={styles.targetWordsColumn}>
                {wordSet.targetWords.map((tw) => {
                  const isOpen = openDropdown === tw.id;
                  const selectedLabel = answers[tw.id];
                  const selectedOption = selectedLabel ? wordSet.options.find(o => o.label === selectedLabel) : null;

                  return (
                    <div key={tw.id} className={styles.matchingRow}>
                      <div className={styles.targetWordText}>{tw.word} = </div>
                      
                      <div className={styles.dropdownContainer}>
                        <div 
                          className={`${styles.dropdownTrigger} ${selectedOption ? styles.hasValue : ''}`}
                          onClick={() => setOpenDropdown(isOpen ? null : tw.id)}
                        >
                          {selectedOption ? (
                            <span><span className={styles.dropdownOptionLabel}>{selectedOption.label}.</span> {selectedOption.text}</span>
                          ) : (
                            <span className={styles.dropdownPlaceholder}>{tw.id}</span>
                          )}
                        </div>

                        {isOpen && (
                          <div className={styles.dropdownMenu} ref={dropdownRef}>
                            {wordSet.options.map((opt) => (
                              <div 
                                key={opt.label} 
                                className={`${styles.dropdownItem} ${selectedLabel === opt.label ? styles.dropdownItemSelected : ''}`}
                                onClick={() => handleOptionSelect(tw.id, opt.label)}
                              >
                                <span className={styles.dropdownOptionLabel}>{opt.label}.</span> {opt.text}
                              </div>
                            ))}
                          </div>
                        )}
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
        onQuestionClick={(questionId) => {
          const page = getPageOfQuestion(questionId);
          setCurrentPage(page);
        }}
        onPrevClick={handlePrev}
        onNextClick={handleNext}
        onSubmitClick={handleSubmit}
        submitLabel={submitLabel}
      />

      <SubmitModal 
        isOpen={showSubmitModal} 
        onBack={handleCloseSubmit} 
        onNext={handleConfirmSubmit} 
      />
    </div>
  );
}
