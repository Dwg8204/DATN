import React, { useContext } from 'react';
import { ReadingTestContext } from '../../../context/ReadingTestContext';

const Part3OpinionMatch = ({ data }) => {
  const { answers, handleAnswerChange } = useContext(ReadingTestContext);

  if (!data) return null;

  return (
    <div className="flex flex-col h-full bg-transparent animate-in fade-in">
      <div className="py-2 sm:py-6 flex-1 flex flex-col md:flex-row gap-6 md:gap-10">
        
        {/* Left: Texts */}
        <div className="w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-gray-100 pb-5 md:pb-0 pr-0 md:pr-6">
          <h3 className="font-bold text-gray-900 mb-4 text-sm">Posts</h3>
          <div className="space-y-6 text-sm text-gray-800 leading-relaxed max-h-[360px] md:max-h-[500px] overflow-y-auto pr-2 md:pr-4 whitespace-pre-wrap">
            {data.passage}
          </div>
        </div>

        {/* Right: Questions */}
        <div className="w-full md:w-1/2 flex flex-col">
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 mb-1">Questions</h3>
          </div>

          <div className="space-y-4">
            {data.questions.map((q, index) => {
              const answerValue = answers[q.id] || '';

              return (
                <div key={q.id} id={`question-${index + 11}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm transition-all duration-300 rounded border border-gray-100 p-3 sm:border-0 sm:p-1">
                  <span className="text-gray-800 flex-1">{index + 1}. {q.statement}</span>
                  
                  <select
                    value={answerValue}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className={`border rounded px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer w-full sm:w-[150px] flex-shrink-0 transition-colors ${
                      answerValue 
                        ? 'bg-[#F3D5B5] border-black text-black font-semibold' 
                        : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  >
                    <option value="" disabled>{`Question ${index + 11}`}</option>
                    {(data.speakers || []).map((opt, i) => (
                      <option key={i} value={opt}>
                        {String.fromCharCode(65 + i)}. {opt}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Part3OpinionMatch;
