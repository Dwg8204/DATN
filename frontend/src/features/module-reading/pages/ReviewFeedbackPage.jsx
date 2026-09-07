import AnswerExplanation from '../../../components/common/AnswerExplanation';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { calculateScore } from '../services/gradingService';
import { loadReadingTest } from '../services/readingTestRepository';
import TestFooter from '../../../components/layout/TestFooter';

const getGapQuestionText = (passage, position) => {
  const marker = `[${position}]`;
  const sentence = String(passage || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.trim())
    .find((item) => item.includes(marker));

  return sentence ? sentence.replace(marker, '_____') : `Question ${position}`;
};

const ReviewFeedbackPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPart, setCurrentPart] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [mode, setMode] = useState('full');

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

        setTestData(testData);
        setMode(sessionData.mode || 'full');

        let initialPart = 1;
        if (sessionData.mode === 'part1') initialPart = 1;
        else if (sessionData.mode === 'part2') initialPart = 2;
        else if (sessionData.mode === 'part3') initialPart = 3;
        else if (sessionData.mode === 'part4') initialPart = 4;
        setCurrentPart(initialPart);

        const gradedResults = calculateScore(sessionData.answers, testData, sessionData.mode || 'full');
        setResults(gradedResults);
      } catch (error) {
        console.error("Error loading review", error);
        navigate('/reading/tests');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [sessionId, navigate]);

  useEffect(() => {
    if (expandedId != null) document.getElementById(`reading-review-${expandedId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [expandedId]);

  const handlePartChange = (partNum) => {
    setCurrentPart(partNum);
    setExpandedId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C82323]"></div>
      </div>
    );
  }

  if (!results || !testData) return null;

  const activeDetails = results[`part${currentPart}`]?.details || [];
  const reviewQuestions = activeDetails.map((detail, index) => ({
    id: index + 1,
    detailId: detail.id,
  }));
  const answeredIds = reviewQuestions
    .filter(({ detailId }) => {
      const detail = activeDetails.find((item) => item.id === detailId);
      return detail?.userAnswer && detail.userAnswer !== '(No answer)';
    })
    .map(({ id }) => String(id));

  const renderReviewCard = ({ id, number, title, detail, options = [] }) => {
    const hasAnswer = detail?.userAnswer && detail.userAnswer !== '(No answer)';
    const status = !hasAnswer ? 'skipped' : detail.isCorrect ? 'correct' : 'wrong';
    const statusLabel = { correct: 'Correct', wrong: 'Incorrect', skipped: 'Skipped' }[status];
    const statusClass = {
      correct: 'bg-[#E2F5E6] text-[#237D36]',
      wrong: 'bg-[#FDE7E9] text-[#B0182D]',
      skipped: 'bg-[#EDEDED] text-[#686868]',
    }[status];
    const isExpanded = expandedId === id;

    return (
      <article key={id} id={`reading-review-${id}`} className="flex flex-col gap-4 rounded-[10px] border border-[#C8C8C8] px-5 py-5 md:px-6">
        <div className="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3 md:grid-cols-[32px_minmax(0,1fr)_auto]">
          <span className="grid h-[30px] w-[30px] place-items-center rounded-[5px] border-2 border-[#DA1E21] bg-[#FFF0F1] font-bold text-[#DA1E21]">
            {number}
          </span>
          {title && (
            <p className="m-0 break-words text-sm sm:text-base leading-6 sm:leading-7 text-black">{title}</p>
          )}
          <span className={`col-start-2 w-fit rounded-full px-3 py-1 text-[13px] font-bold md:col-start-auto ${statusClass}`}>
            {statusLabel}
          </span>
        </div>

        {options.length > 0 && (
          <div className="flex flex-col gap-2 pl-0 md:pl-11">
            {options.map((option) => (
              <div
                key={option.label}
                aria-label={`${option.text}${option.isCorrect ? ', correct' : option.isUser ? ', selected, incorrect' : ''}`}
                className={`grid min-h-10 grid-cols-[28px_minmax(0,1fr)]  items-center gap-2 sm:gap-3 rounded-md border px-3 py-1.5 ${
                  option.isCorrect
                    ? 'border-[#43B75D] bg-[#EDF9F0]'
                    : option.isUser
                      ? 'border-[#DA1E21] bg-[#FFF0F1]'
                      : 'border-transparent'
                }`}
              >
                <span className="font-bold">{option.label}</span>
                <span>{option.text}</span>


              </div>
            ))}
          </div>
        )}

        {options.length === 0 && <div className="grid grid-cols-1 gap-3 pl-0 text-sm md:ml-11 md:grid-cols-2 break-words">
          <div className={`rounded-md border px-3 py-2 ${status === 'correct' ? 'border-[#43B75D] bg-[#EDF9F0]' : status === 'wrong' ? 'border-[#DA1E21] bg-[#FFF0F1]' : 'border-[#868686] text-[#686868]'}`}>
            {hasAnswer ? detail.userAnswer : 'No answer'}
          </div>
          <div className="rounded-md border border-[#43B75D] bg-[#EDF9F0] px-3 py-2">
            {detail?.correctAnswer || '—'}
          </div>
        </div>}
        <AnswerExplanation text={detail?.explanation} open={isExpanded || undefined} />
      </article>
    );
  };

  const renderStandardReview = () => {
    if (currentPart === 1) {
      return (
        <div className="flex flex-col gap-6">
          {testData.part1.questions.map((question, index) => {
            const detail = results.part1.details.find((item) => item.id === question.id);
            return renderReviewCard({
              id: question.id,
              number: index + 1,
              title: getGapQuestionText(testData.part1.passage, question.position),
              detail,
              options: question.options.map((text, optionIndex) => ({
                label: String.fromCharCode(65 + optionIndex),
                text,
                isCorrect: text === question.answer,
                isUser: text === detail?.userAnswer,
              })),
            });
          })}
        </div>
      );
    }

    if (currentPart === 2) {
      return (
        <div className="flex flex-col gap-6">
          {testData.part2.sentences.filter((sentence) => sentence.correctPosition > 1).map((sentence, index) => {
            const detail = results.part2.details.find((item) => item.id === sentence.id);
            return renderReviewCard({
              id: `p2-${sentence.correctPosition}`,
              number: index + 1,
              title: `Sentence for gap [${sentence.correctPosition}]: ${sentence.content}`,
              detail,
            });
          })}
        </div>
      );
    }

    if (currentPart === 3) {
      return (
        <div className="flex flex-col gap-6">
          {testData.part3.questions.map((question, index) => {
            const detail = results.part3.details.find((item) => item.id === question.id);
            return renderReviewCard({
              id: question.id,
              number: index + 1,
              title: question.statement,
              detail,
              options: testData.part3.speakers.map((speaker) => ({
                label: speaker,
                text: speaker,
                isCorrect: speaker === question.answer,
                isUser: speaker === detail?.userAnswer,
              })),
            });
          })}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        {testData.part4.paragraphs.map((paragraph, index) => {
          const detail = results.part4.details.find((item) => item.id === paragraph.id);
          const correctHeading = testData.part4.headings.find((heading) => heading.correctParagraph === paragraph.id);
          return renderReviewCard({
            id: paragraph.id,
            number: index + 1,
            title: `${paragraph.label}: ${paragraph.content}`,
            detail,
            options: testData.part4.headings.map((heading, headingIndex) => ({
              label: String.fromCharCode(65 + headingIndex),
              text: heading.text,
              isCorrect: heading.id === correctHeading?.id,
              isUser: heading.text === detail?.userAnswer,
            })),
          });
        })}
      </div>
    );
  };

  const renderActiveReview = () => renderStandardReview();

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">

      <main className="flex-1 w-full px-4 md:px-12 lg:px-[72px] py-5 sm:py-8 space-y-6 sm:space-y-8">
        {mode === 'full' && (
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4].map((partNum) => (
              <button
                key={partNum}
                onClick={() => handlePartChange(partNum)}
                className={`px-3 sm:px-5 py-2.5 border rounded-lg text-sm sm:text-base font-bold transition-colors ${
                  currentPart === partNum
                    ? 'border-[#DA1E21] bg-[#DA1E21] text-white hover:bg-[#B5161A]'
                    : 'border-[#DA1E21] bg-white text-[#DA1E21] hover:bg-[#FFF0F1]'
                }`}
              >
                Part {partNum}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1 text-base leading-7">
          <strong className="text-lg leading-8">Reading · Part {currentPart}</strong>
          <span>Review your answer, compare it with the correct answer, and open an explanation when needed.</span>
        </div>

        {/* Grey Header card for Active Part */}
        <div className="bg-white flex flex-col">

          <div className="hidden bg-[#FAF8F5] px-6 py-4 border-b border-[#E5E2D9] items-center">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">
              READING PART {currentPart}
            </h2>
          </div>

          <div className="bg-white flex-1 min-h-[400px]">
            {renderActiveReview()}
          </div>
        </div>

        {/* Custom Navigation bottom bar according to mockup */}
        <div className="hidden bg-white border border-[#E5E2D9] rounded-xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">

          {/* Part switch tabs */}
          {mode === 'full' ? (
            <div className="flex items-center gap-4">
              <span className="font-black text-xs text-gray-800 uppercase tracking-wider">Part {currentPart}</span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map(partNum => (
                  <button
                    key={partNum}
                    onClick={() => handlePartChange(partNum)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-black transition-all cursor-pointer ${
                      currentPart === partNum
                        ? 'bg-[#C82323] text-white shadow-sm'
                        : 'text-[#C82323] bg-red-50/40 hover:bg-red-50 border border-red-100'
                    }`}
                  >
                    {partNum}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="font-black text-xs text-gray-800 uppercase tracking-wider">Part {currentPart} (Single Part Test)</span>
            </div>
          )}

          {/* Navigation Arrows & Action Button */}
          <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">

            {/* Arrows */}
            {mode === 'full' && (
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPart === 1}
                  onClick={() => handlePartChange(currentPart - 1)}
                  className="w-8 h-8 rounded-full border border-[#E5E2D9] flex items-center justify-center bg-white hover:bg-gray-50 transition-colors disabled:opacity-40 cursor-pointer text-gray-600 font-bold"
                >
                  &larr;
                </button>
                <button
                  disabled={currentPart === 4}
                  onClick={() => handlePartChange(currentPart + 1)}
                  className="w-8 h-8 rounded-full border border-[#E5E2D9] flex items-center justify-center bg-white hover:bg-gray-50 transition-colors disabled:opacity-40 cursor-pointer text-gray-600 font-bold"
                >
                  &rarr;
                </button>
              </div>
            )}

            {/* Take another test */}
            <button
              onClick={() => navigate('/reading/tests')}
              className="bg-white border-2 border-[#C82323] text-[#C82323] hover:bg-red-50 text-xs font-black tracking-wide py-2.5 px-6 rounded-lg transition-colors cursor-pointer"
            >
              Take another test
            </button>
          </div>

        </div>

      </main>

      <TestFooter
        partLabel={`Part ${currentPart}`}
        questions={reviewQuestions}
        answeredIds={answeredIds}
        currentPageQuestionIds={reviewQuestions.map(({ id }) => id)}
        onQuestionClick={(questionId) => {
          const selected = reviewQuestions.find(({ id }) => id === questionId);
          if (!selected) return;

          if (currentPart === 2) {
            const position = activeDetails.find((item) => item.id === selected.detailId)?.correctAnswer?.match(/\d+$/)?.[0];
            setExpandedId(position ? `p2-${position}` : null);
            return;
          }

          setExpandedId(selected.detailId);
        }}
        onPrevClick={() => mode === 'full' && handlePartChange(Math.max(1, currentPart - 1))}
        onNextClick={() => mode === 'full' && handlePartChange(Math.min(4, currentPart + 1))}
        onSubmitClick={() => navigate('/reading/tests')}
        submitLabel="Take another test"
      />

      {/* AptiMate Footer */}
      <footer className="hidden bg-[#FAF8F5] border-t border-[#E5E2D9] py-12 mt-16 text-gray-600 font-sans">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row justify-between gap-10">

          <div className="flex flex-col space-y-4">
            <span className="text-2xl font-black tracking-tight flex items-baseline">
              <span className="text-[#C82323] text-3xl font-serif">A</span>
              <span className="text-gray-800 -ml-0.5 text-lg font-bold font-sans">ptiMate</span>
            </span>
            <div className="flex flex-col space-y-1.5 text-xs font-bold text-gray-500">
              <a href="#" className="hover:text-gray-900 transition-colors">About us</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Terms of use</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Disclaimer</a>
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">CONTACT</h4>
            <div className="flex flex-col space-y-1.5 text-xs font-bold text-gray-500">
              <span className="hover:text-gray-900 transition-colors cursor-pointer">Hotline</span>
              <span className="hover:text-gray-900 transition-colors cursor-pointer">Email</span>
              <span className="hover:text-gray-900 transition-colors cursor-pointer">Facebook</span>
              <span className="hover:text-gray-900 transition-colors cursor-pointer">Location</span>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end justify-between space-y-6 md:space-y-0">
            <button className="bg-[#C82323] hover:bg-[#A81E1E] text-white text-xs font-black tracking-wider py-2.5 px-6 rounded-full transition-all shadow-sm cursor-pointer">
              Leave us feedback
            </button>
            <div className="text-[10px] font-bold text-gray-400 text-left md:text-right mt-auto">
              Copyright ©2026 APTIS test, Inc. All rights reserved.
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default ReviewFeedbackPage;
