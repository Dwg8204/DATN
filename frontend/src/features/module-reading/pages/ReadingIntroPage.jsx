import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

const modeConfigs = {
  part1: {
    title: 'APTIS GENERAL READING - PART 1',
    subtitle: 'Sentence Comprehension',
    time: 'Time: 5 min',
    instructions: 'Read the short text. Choose a word from the list to complete the text.',
    information: 'This part consists of 1 short letter with 5 gaps. Choose the correct word for each gap.'
  },
  part2: {
    title: 'APTIS GENERAL READING - PART 2',
    subtitle: 'Text Cohesion',
    time: 'Time: 6 min',
    instructions: 'The sentences below are from a report. Put the sentences in the right order.',
    information: 'This part consists of 1 short text split into 6 sentences. Put them in the correct order.'
  },
  part3: {
    title: 'APTIS GENERAL READING - PART 3',
    subtitle: 'Opinion Matching',
    time: 'Time: 10 min',
    instructions: 'Read the opinions of four people and match them to the statements.',
    information: 'This part consists of 4 short texts from 4 people. Match the 7 statements to the correct speakers.'
  },
  part4: {
    title: 'APTIS GENERAL READING - PART 4',
    subtitle: 'Heading Matching',
    time: 'Time: 14 min',
    instructions: 'Read the passage. Choose a heading for each numbered paragraph.',
    information: 'This part consists of a long text with 7 paragraphs. Select the best heading for each paragraph from the 8 options.'
  },
  full: {
    title: 'APTIS GENERAL READING',
    subtitle: 'Full Test',
    time: 'Time: 35 min',
    instructions: 'Answer all the questions.\nYou can change your answers at any time during the test.',
    information: 'This test consists of 4 parts.\nThe tasks become more difficult as the test progresses.\nThe test clock will show you when there are 10 minutes and 5 minutes remaining.'
  }
};

const ReadingIntroPage = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'full';
  
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestDetails = async () => {
      setLoading(true);
      try {
        const data = await import('../services/mockData/testList.json');
        const foundTest = data.tests?.find(t => t.id === testId);
        
        setTimeout(() => {
          setTest(foundTest || null);
          setLoading(false);
        }, 400);
      } catch (error) {
        console.error("Failed to load test details", error);
        setLoading(false);
      }
    };
    
    fetchTestDetails();
  }, [testId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const currentConfig = modeConfigs[mode] || modeConfigs.full;

  return (
    <div className="bg-[#f0f0f0] min-h-[calc(100vh-64px)] py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header bar matching the image */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-bold text-sm">A</div>
            <span className="text-xl font-extrabold text-gray-900 tracking-tight">APTIS<span className="text-red-600">Mate</span></span>
          </div>
          <div className="font-bold text-gray-800">
            Test: {test?.title || "General Practice"}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12 lg:p-16 flex justify-center">
          <div className="w-full max-w-2xl bg-white border border-gray-300 rounded-lg p-8 md:p-10 shadow-sm relative">
            <h2 className="text-center font-bold text-xl mb-2 tracking-wide text-gray-900">{currentConfig.title}</h2>
            {currentConfig.subtitle && (
              <h3 className="text-center font-semibold text-sm text-gray-500 mb-10 italic">{currentConfig.subtitle}</h3>
            )}
            
            <div className="text-sm font-medium text-gray-800 mb-8">
              {currentConfig.time}
            </div>
            
            <div className="mb-8">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">INSTRUCTIONS TO CANDIDATES</h3>
              <ul className="list-none space-y-2 text-sm text-gray-700">
                {currentConfig.instructions.split('\n').map((line, i) => (
                  <li key={i} className="flex items-start">
                    <span className="mr-2">•</span> {line}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mb-10">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">INFORMATION FOR CANDIDATES</h3>
              <ul className="list-none space-y-2 text-sm text-gray-700">
                {currentConfig.information.split('\n').map((line, i) => (
                  <li key={i} className="flex items-start">
                    <span className="mr-2">•</span> {line}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="text-center font-bold text-sm text-gray-900 mb-6">
              Do not click 'Start test' until you are told to do so.
            </div>
            
            <div className="flex justify-center">
              <button 
                onClick={() => navigate(`/reading/test/${testId}?mode=${mode}`)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-8 rounded-full transition-colors text-sm"
              >
                Start test
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingIntroPage;
