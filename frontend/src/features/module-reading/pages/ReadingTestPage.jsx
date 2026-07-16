import React, { useEffect, useContext, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReadingTestContext } from '../context/ReadingTestContext';
import TestHeader from '../components/test-engine/TestHeader';
import ExitModal from '../components/test-engine/ExitModal';
import SubmitModal from '../components/test-engine/SubmitModal';

import Part1GapFilling from '../components/test-engine/parts/Part1GapFilling';
import Part2TextCohesion from '../components/test-engine/parts/Part2TextCohesion';
import Part3OpinionMatch from '../components/test-engine/parts/Part3OpinionMatch';
import Part4MatchHeading from '../components/test-engine/parts/Part4MatchHeading';

import { TestEngineSkeleton } from '../../../components/common/SkeletonLoaders';

const ReadingTestPage = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { 
    testData, setTestData, 
    currentPart, setCurrentPart,
    setIsStarted, setTimeLeft,
    answers, timeLeft
  } = useContext(ReadingTestContext);

  const [loading, setLoading] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        const data = await import('../services/mockData/testData.json');
        setTimeout(() => {
          setTestData(data.default || data);
          setIsStarted(true);
          setTimeLeft(35 * 60);
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error("Failed to load test data", error);
        setLoading(false);
      }
    };
    
    fetchTestData();

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setIsStarted(false);
    };
  }, [testId, setTestData, setIsStarted, setTimeLeft]);

  const handleExit = () => setShowExitModal(true);
  const confirmExit = () => {
    setIsStarted(false);
    navigate('/reading/choose');
  };
  const handleSubmit = () => setShowSubmitModal(true);
  const confirmSubmit = () => {
    const fakeSessionId = 'sess-' + Math.random().toString(36).substr(2, 9);
    const sessionData = {
      testId: testId || 'apt-r-001',
      answers: answers,
      timeSpent: 35 * 60 - timeLeft,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(fakeSessionId, JSON.stringify(sessionData));
    navigate(`/reading/result/${fakeSessionId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#d9d9d9] flex flex-col">
        <header className="bg-white shadow-sm border-b border-gray-100 h-16"></header>
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col">
          <TestEngineSkeleton />
        </main>
      </div>
    );
  }

  const renderCurrentPart = () => {
    switch (currentPart) {
      case 1: return <Part1GapFilling data={testData.part1} />;
      case 2: return <Part2TextCohesion data={testData.part2} />;
      case 3: return <Part3OpinionMatch data={testData.part3} />;
      case 4: return <Part4MatchHeading data={testData.part4} />;
      default: return <Part1GapFilling data={testData.part1} />;
    }
  };

  const handleNextPart = () => {
    if (currentPart < 4) setCurrentPart(currentPart + 1);
  };
  
  const handlePrevPart = () => {
    if (currentPart > 1) setCurrentPart(currentPart - 1);
  };

  // Navigator bar matching the mockup
  const NavigationBar = () => (
    <div className="flex justify-between items-center px-6 py-3 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-6">
        <span className="font-bold text-sm text-gray-800">Part {currentPart}</span>
        <div className="flex items-center gap-1.5">
          <button onClick={handlePrevPart} disabled={currentPart === 1} className="w-6 h-6 flex items-center justify-center text-blue-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:hover:bg-transparent font-bold">{'<'}</button>
          {[1, 2, 3, 4].map(partNum => (
            <button
              key={partNum}
              onClick={() => setCurrentPart(partNum)}
              className={`w-6 h-6 flex items-center justify-center rounded text-sm font-bold ${
                currentPart === partNum ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              {partNum}
            </button>
          ))}
          <button onClick={handleNextPart} disabled={currentPart === 4} className="w-6 h-6 flex items-center justify-center text-blue-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:hover:bg-transparent font-bold">{'>'}</button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {currentPart < 4 && (
          <button onClick={handleNextPart} className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors">
            {'>'}
          </button>
        )}
        <button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1.5 px-6 rounded-full transition-colors">
          Submit
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#d9d9d9] flex flex-col">
      <TestHeader onExit={handleExit} onSubmit={handleSubmit} />
      
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 py-8 flex flex-col">
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden flex flex-col min-h-[600px]">
          
          {currentPart === 1 && <NavigationBar />}
          
          <div className="flex-1 p-0 flex flex-col">
            {renderCurrentPart()}
          </div>
          
          {currentPart > 1 && <NavigationBar />}

        </div>
      </main>

      {showExitModal && (
        <ExitModal 
          onConfirm={confirmExit} 
          onCancel={() => setShowExitModal(false)} 
        />
      )}
      
      {showSubmitModal && (
        <SubmitModal 
          onConfirm={confirmSubmit} 
          onCancel={() => setShowSubmitModal(false)}
          answers={answers}
        />
      )}
    </div>
  );
};

export default ReadingTestPage;
