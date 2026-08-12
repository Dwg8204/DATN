import React, { useContext } from 'react';
import { ReadingTestContext } from '../../../context/ReadingTestContext';

const Part1GapFilling = ({ data }) => {
  const { answers, handleAnswerChange } = useContext(ReadingTestContext);

  if (!data) return null;

  const renderPassage = () => {
    const parts = data.passage.split(/(\[\d+\])/g);

    return parts.map((part, index) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const position = parseInt(match[1]);
        const question = data.questions.find(q => q.position === position);
        
        if (!question) return part;

        const answerValue = answers[question.id] || '';

        return (
          <span key={index} id={`question-${position}`} className="inline-flex max-w-full items-center mx-1 sm:mx-2 align-middle transition-all duration-300 rounded p-1">
            <select
              value={answerValue}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              className={`w-full max-w-[220px] sm:w-auto border rounded px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer min-w-0 sm:min-w-[130px] transition-colors ${
                answerValue 
                  ? 'bg-[#F3D5B5] border-black text-black font-semibold' 
                  : 'bg-white border-gray-300 text-gray-800'
              }`}
            >
              <option value="" disabled>{`Question ${position}`}</option>
              {question.options.map((opt, i) => (
                <option key={i} value={opt}>
                  {String.fromCharCode(65 + i)}. {opt}
                </option>
              ))}
            </select>
          </span>
        );
      }

      return (
        <span key={index} className="whitespace-pre-wrap">
          {part}
        </span>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-transparent animate-in fade-in">
      <div className="py-2 sm:py-4 flex-1">
        <div className="text-sm leading-7 sm:leading-loose text-gray-800 max-w-3xl break-words">
          {renderPassage()}
        </div>
      </div>
    </div>
  );
};

export default Part1GapFilling;
