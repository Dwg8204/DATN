import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ReadingIntroPage = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
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
            Test taker ID
          </div>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12 lg:p-16 flex justify-center">
          <div className="w-full max-w-2xl bg-white border border-gray-300 rounded-lg p-8 md:p-10 shadow-sm relative">
            <h2 className="text-center font-bold text-xl mb-10 tracking-wide text-gray-900">APTIS GENERAL READING</h2>
            
            <div className="text-sm font-medium text-gray-800 mb-8">
              Time: 35 min
            </div>
            
            <div className="mb-8">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">INSTRUCTIONS TO CANDIDATES</h3>
              <ul className="list-none space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="mr-2">•</span> Answer all the questions.
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span> You can change your answers at any time during the test.
                </li>
              </ul>
            </div>
            
            <div className="mb-10">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">INFORMATION FOR CANDIDATES</h3>
              <ul className="list-none space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="mr-2">•</span> The test consists of 4 parts.
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span> The task becomes more difficult as the test progresses.
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span> The task clock will flash when there are 5 minutes remaining.
                </li>
              </ul>
            </div>
            
            <div className="text-center font-bold text-sm text-gray-900 mb-6">
              Do not click 'Start test' until you are told to do so.
            </div>
            
            <div className="flex justify-center">
              <button 
                onClick={() => navigate(`/reading/test/${testId}`)}
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
