import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { calculateScore } from '../services/gradingService';

const ReviewFeedbackPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPart, setCurrentPart] = useState(1);
  const [selectedExplanation, setSelectedExplanation] = useState(null);
  const [mode, setMode] = useState('full');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const sessionDataString = localStorage.getItem(sessionId);
        if (!sessionDataString) {
          navigate('/reading/choose');
          return;
        }

        const sessionData = JSON.parse(sessionDataString);
        const testDataModule = await import('../services/mockData/testData.json');
        const testData = testDataModule.default || testDataModule;

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
        navigate('/reading/choose');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [sessionId, navigate]);

  const handlePartChange = (partNum) => {
    setCurrentPart(partNum);
    setSelectedExplanation(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C82323]"></div>
      </div>
    );
  }

  if (!results || !testData) return null;

  const renderPart1Review = () => {
    const data = testData.part1;
    if (!data) return null;
    const parts = data.passage.split(/(\[\d+\])/g);

    return (
      <div className="flex flex-col h-full animate-in fade-in duration-300">
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-1">Question 1 of 5</h3>
          <p className="text-gray-700 text-sm">Read the email from Janice to her friend. Choose one word from the list for each gap. The first one is done for you.</p>
        </div>

        <div className="text-sm leading-loose text-gray-800 max-w-3xl mb-4">
          {parts.map((part, index) => {
            const match = part.match(/\[(\d+)\]/);
            if (match) {
              const position = parseInt(match[1]);
              const question = data.questions.find(q => q.position === position);
              if (!question) return part;

              const detail = results.part1.details.find(d => d.id === question.id);
              const isCorrect = detail?.isCorrect;
              const userAnswer = detail?.userAnswer || '';

              return (
                <span key={index} className="inline-flex items-center mx-2 align-middle">
                  <select
                    disabled
                    value={userAnswer}
                    className={`appearance-none bg-white border ${
                      isCorrect ? 'border-[#E5E2D9]' : 'border-[#C82323] border-2 ring-1 ring-[#C82323]'
                    } py-1 pl-3 pr-8 rounded text-sm text-gray-800 focus:outline-none min-w-[120px]`}
                    style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
                  >
                    <option value="" disabled></option>
                    {question.options.map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => setSelectedExplanation({
                      title: `Gap [${position}]`,
                      userAnswer,
                      correctAnswer: question.answer,
                      isCorrect,
                      explanation: detail?.explanation || `The correct word is "${question.answer}".`
                    })}
                    className="ml-1.5 px-3 py-1 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-black rounded tracking-wide transition-colors cursor-pointer"
                  >
                    Explain
                  </button>
                </span>
              );
            }
            return (
              <span key={index} className="whitespace-pre-wrap">
                {part}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPart2Review = () => {
    const data = testData.part2;
    if (!data) return null;
    const firstSentence = data.sentences[0]?.content || "The report provides information about the really problems on the current road.";

    return (
      <div className="flex flex-col h-full animate-in fade-in duration-300">
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-1">Question 2 of 5</h3>
          <p className="text-gray-700 text-sm">The sentences below are from a report. Put the sentences in the right order. The first sentence is done for you.</p>
        </div>

        <div className="space-y-4 max-w-3xl">
          {/* First sentence (done for you) */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 min-h-[60px] flex items-center shadow-sm">
            <span className="text-sm font-semibold text-[#16A34A] mr-3">1</span>
            <span className="text-sm font-medium text-gray-800 flex-1">{firstSentence}</span>
            <span className="text-[10px] font-black text-gray-400 border border-gray-300 rounded-lg px-2 py-0.5 uppercase tracking-wider">Given</span>
          </div>

          {/* User placement slots */}
          {[2, 3, 4, 5, 6].map(position => {
            const correctSentence = data.sentences.find(s => s.correctPosition === position);
            if (!correctSentence) return null;

            const userPlacedSentence = results.part2.details.find(d => d.correctAnswer === `Position ${position}`);
            const isCorrect = userPlacedSentence?.isCorrect;
            const userSentence = data.sentences.find(s => s.id === userPlacedSentence?.id);

            return (
              <div 
                key={position}
                className={`border rounded-xl px-4 py-3 min-h-[60px] flex flex-col md:flex-row md:items-center gap-3 shadow-sm transition-all ${
                  isCorrect 
                    ? 'bg-white border-green-200 hover:border-green-300' 
                    : 'bg-red-50/10 border-red-200 hover:border-red-300'
                }`}
              >
                <div className="flex items-center flex-1 min-w-0">
                  <span className={`text-sm font-black mr-3 w-5 h-5 flex items-center justify-center rounded-full ${
                    isCorrect ? 'bg-green-100 text-[#16A34A]' : 'bg-red-100 text-[#C82323]'
                  }`}>
                    {position}
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 leading-normal">
                      {userSentence ? userSentence.content : <span className="text-gray-400 italic">No sentence placed</span>}
                    </p>
                    
                    {!isCorrect && (
                      <div className="mt-1.5 text-xs text-gray-500 font-bold">
                        <span className="text-[#16A34A]">Correct sentence:</span> {correctSentence.content}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-2 md:mt-0">
                  {isCorrect ? (
                    <span className="text-[#16A34A] text-xs font-black tracking-wide">✓ Correct</span>
                  ) : (
                    <span className="text-[#C82323] text-xs font-black tracking-wide">✕ Incorrect</span>
                  )}
                  <button 
                    onClick={() => setSelectedExplanation({
                      title: `Sentence Gap [${position}]`,
                      userAnswer: userSentence ? userSentence.content : 'None',
                      correctAnswer: correctSentence.content,
                      isCorrect,
                      explanation: userPlacedSentence?.explanation || `The sentence "${correctSentence.content}" matches Gap [${position}].`
                    })}
                    className="px-3 py-1 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-black rounded tracking-wide transition-colors cursor-pointer"
                  >
                    Explain
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPart3Review = () => {
    const data = testData.part3;
    if (!data) return null;

    return (
      <div className="flex flex-col h-full animate-in fade-in duration-300">
        <div className="mb-4">
          <h3 className="font-bold text-gray-900 mb-1">Question 3 of 5</h3>
          <p className="text-gray-700 text-sm">Four people respond in the comments section of an online magazine article. Read the texts and answer the questions below.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Left: Scrollable passage */}
          <div className="w-full md:w-1/2 bg-gray-50/70 border border-[#E5E2D9] rounded-xl p-4 max-h-[400px] overflow-y-auto pr-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            <h4 className="font-black text-gray-850 mb-2 uppercase text-[10px] tracking-widest border-b border-gray-150 pb-1">Posts</h4>
            {data.passage}
          </div>

          {/* Right: Question list with disabled selects & explains */}
          <div className="w-full md:w-1/2 space-y-4">
            <h4 className="font-black text-gray-850 uppercase text-[10px] tracking-widest border-b border-gray-150 pb-1">Questions</h4>
            {data.questions.map((q, index) => {
              const detail = results.part3.details.find(d => d.id === q.id);
              const isCorrect = detail?.isCorrect;
              const userAnswer = detail?.userAnswer || '';

              return (
                <div key={q.id} className="border border-[#E5E2D9] rounded-xl p-4 bg-white shadow-sm space-y-3">
                  <div className="text-sm font-bold text-gray-800">
                    {index + 1}. {q.statement}
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <select
                        disabled
                        value={userAnswer}
                        className={`appearance-none bg-white border ${
                          isCorrect ? 'border-[#E5E2D9]' : 'border-[#C82323] border-2 ring-1 ring-[#C82323]'
                        } py-1.5 pl-3 pr-8 rounded text-sm text-gray-800 focus:outline-none w-[130px]`}
                        style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
                      >
                        <option value="" disabled></option>
                        {data.speakers.map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                      
                      {!isCorrect && (
                        <span className="text-xs text-gray-500 font-bold">
                          Correct: <span className="text-[#16A34A]">{q.answer}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isCorrect ? (
                        <span className="text-[#16A34A] text-xs font-black tracking-wide">✓ Correct</span>
                      ) : (
                        <span className="text-[#C82323] text-xs font-black tracking-wide">✕ Incorrect</span>
                      )}
                      <button 
                        onClick={() => setSelectedExplanation({
                          title: `Question ${index + 1}`,
                          userAnswer,
                          correctAnswer: q.answer,
                          isCorrect,
                          explanation: detail?.explanation || `${q.answer} commented on this topic in the passage.`
                        })}
                        className="px-3 py-1 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-black rounded tracking-wide transition-colors cursor-pointer"
                      >
                        Explain
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderPart4Review = () => {
    const data = testData.part4;
    if (!data) return null;

    return (
      <div className="flex flex-col h-full animate-in fade-in duration-300">
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-1">Question 4 of 5</h3>
          <p className="text-gray-700 text-sm">Read the passage quickly. Choose a heading for each numbered paragraph (1 - 3) from the drop-down box.</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2 text-center">{data.title || "Mission to Mars"}</h2>
          
          <div className="space-y-6">
            {data.paragraphs.map((paragraph, index) => {
              const correctHeading = data.headings.find(h => h.correctParagraph === paragraph.id);
              const userPlacedHeadingId = results.part4.details.find(d => d.question === `Heading for ${paragraph.id}`);
              const isCorrect = userPlacedHeadingId?.isCorrect;
              const userHeading = data.headings.find(h => h.id === userPlacedHeadingId?.id);

              return (
                <div key={paragraph.id} className="border border-[#E5E2D9] rounded-xl p-5 bg-white shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-2">
                    <span className="font-black text-gray-900 text-sm">{paragraph.label}</span>
                    
                    <div className="flex items-center gap-3">
                      <select
                        disabled
                        value={userPlacedHeadingId?.id || ''}
                        className={`appearance-none bg-white border ${
                          isCorrect ? 'border-[#E5E2D9]' : 'border-[#C82323] border-2 ring-1 ring-[#C82323]'
                        } py-1 pl-2 pr-8 rounded text-sm text-gray-800 focus:outline-none min-w-[200px]`}
                        style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right .5rem top 50%', backgroundSize: '.65rem auto' }}
                      >
                        <option value="" disabled>- - -</option>
                        {data.headings.map((heading) => (
                          <option key={heading.id} value={heading.id}>{heading.text}</option>
                        ))}
                      </select>

                      <button 
                        onClick={() => setSelectedExplanation({
                          title: `${paragraph.label} Heading`,
                          userAnswer: userHeading ? userHeading.text : 'None',
                          correctAnswer: correctHeading ? correctHeading.text : 'None',
                          isCorrect,
                          explanation: userPlacedHeadingId?.explanation || `The correct heading is "${correctHeading?.text}".`
                        })}
                        className="px-3 py-1 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-black rounded tracking-wide transition-colors cursor-pointer"
                      >
                        Explain
                      </button>
                    </div>
                  </div>

                  <div className="text-sm text-gray-700 leading-relaxed pl-3 border-l-2 border-gray-200">
                    <p>{paragraph.content}</p>
                  </div>
                  
                  {!isCorrect && correctHeading && (
                    <div className="text-xs text-[#16A34A] font-bold pl-3">
                      Correct heading: {correctHeading.text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderActiveReview = () => {
    switch (currentPart) {
      case 1: return renderPart1Review();
      case 2: return renderPart2Review();
      case 3: return renderPart3Review();
      case 4: return renderPart4Review();
      default: return renderPart1Review();
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col font-sans">
      
      {/* Mini Header bar displaying Test taker ID */}
      <div className="bg-white border-b border-gray-200 py-3 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
          <span className="flex items-baseline">
            <span className="text-[#C82323] text-sm font-serif mr-0.5">A</span>ptiMate Review
          </span>
          <span>Test taker ID: {sessionId.substring(5, 12)}</span>
        </div>
      </div>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
        
        {/* Grey Header card for Active Part */}
        <div className="bg-[#FAF8F5] border border-[#E5E2D9] rounded-2xl overflow-hidden shadow-sm flex flex-col">
          
          <div className="bg-[#FAF8F5] px-6 py-4 border-b border-[#E5E2D9] flex items-center">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">
              READING PART {currentPart}
            </h2>
          </div>

          <div className="p-6 md:p-8 bg-white flex-1 min-h-[400px]">
            {renderActiveReview()}
            
            {/* Elegant AI Explanation Accordion/Drawer */}
            {selectedExplanation && (
              <div className="mt-8 border-t border-[#E5E2D9] pt-6 animate-in slide-in-from-top-4 duration-300">
                <div className="bg-[#FAF8F5] border border-[#E5E2D9] rounded-xl p-5">
                  <div className="flex items-start">
                    <div className="bg-[#E0F2FE] px-2.5 py-1.5 rounded-lg mr-4 shrink-0 flex items-center justify-center">
                      <span className="text-[#C82323] text-lg font-black font-serif">A</span>
                      <span className="text-gray-800 text-[10px] font-black">I</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3 border-b border-gray-200/50 pb-2">
                        <h4 className="text-xs font-black text-gray-850 uppercase tracking-wider">
                          Explanation: {selectedExplanation.title}
                        </h4>
                        <button 
                          onClick={() => setSelectedExplanation(null)}
                          className="text-gray-400 hover:text-gray-700 text-[10px] font-black px-2 py-0.5 rounded border border-[#E5E2D9] bg-white hover:bg-gray-50 cursor-pointer uppercase tracking-wider"
                        >
                          Close
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] mb-4 font-bold">
                        <div className="bg-white border border-gray-150 p-2.5 rounded-lg">
                          <span className="text-gray-400 block mb-0.5 uppercase tracking-wide">Your Choice</span>
                          <span className={selectedExplanation.isCorrect ? 'text-[#16A34A]' : 'text-[#C82323]'}>
                            {selectedExplanation.userAnswer || <span className="italic">No Answer</span>}
                          </span>
                        </div>
                        <div className="bg-white border border-gray-150 p-2.5 rounded-lg">
                          <span className="text-[#16A34A] block mb-0.5 uppercase tracking-wide">Correct Answer</span>
                          <span className="text-gray-700">
                            {selectedExplanation.correctAnswer}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 leading-relaxed font-semibold">
                        {selectedExplanation.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Custom Navigation bottom bar according to mockup */}
        <div className="bg-white border border-[#E5E2D9] rounded-xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          
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
              onClick={() => navigate('/reading/choose')}
              className="bg-white border-2 border-[#C82323] text-[#C82323] hover:bg-red-50 text-xs font-black tracking-wide py-2.5 px-6 rounded-lg transition-colors cursor-pointer"
            >
              Take another test
            </button>
          </div>

        </div>

      </main>

      {/* AptiMate Footer */}
      <footer className="bg-[#FAF8F5] border-t border-[#E5E2D9] py-12 mt-16 text-gray-600 font-sans">
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
