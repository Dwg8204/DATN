import React, { useContext } from 'react';
import { ReadingTestContext } from '../../../context/ReadingTestContext';

const Part4MatchHeading = ({ data }) => {
  const { answers, handleAnswerChange } = useContext(ReadingTestContext);

  if (!data) return null;

  return (
    <div className="flex flex-col h-full bg-transparent animate-in fade-in">
      <div className="py-2 sm:py-6 flex-1">

        <div className="max-w-4xl mx-auto">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6 text-center">{data.title || "Mission to Mars"}</h2>
          
          <div className="space-y-5 sm:space-y-8 text-sm text-gray-800 leading-relaxed">
            {data.paragraphs.map((paragraph, index) => {
              const answerValue = answers[paragraph.id] || '';

              return (
                <div key={paragraph.id} id={`question-${index + 18}`} className="flex flex-col sm:flex-row gap-3 items-start transition-all duration-300 rounded border border-gray-100 p-3 sm:border-0 sm:p-1">
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-gray-900">{index + 1}.</span>
                    
                    <select
                      value={answerValue}
                      onChange={(e) => handleAnswerChange(paragraph.id, e.target.value)}
                      className={`border rounded px-2 py-1 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer w-[min(100%,260px)] sm:max-w-[200px] truncate transition-colors ${
                        answerValue 
                          ? 'bg-[#F3D5B5] border-black text-black font-semibold' 
                          : 'bg-white border-gray-300 text-gray-800'
                      }`}
                    >
                      <option value="" disabled>{`Question ${index + 18}`}</option>
                      {data.headings.map((heading, i) => (
                        <option key={heading.id} value={heading.id}>
                          {String.fromCharCode(65 + i)}. {heading.text}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 mt-1 sm:mt-0">
                    <p>{paragraph.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Part4MatchHeading;
