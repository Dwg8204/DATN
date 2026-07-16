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
          <span key={index} className="inline-flex items-center mx-2 align-middle">
            <select
              value={answerValue}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              className="appearance-none bg-white border border-gray-300 py-1 pl-3 pr-8 rounded text-sm text-gray-800 focus:outline-none focus:border-blue-500 cursor-pointer min-w-[120px]"
              style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
            >
              <option value="" disabled></option>
              {question.options.map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
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
    <div className="flex flex-col h-full bg-white animate-in fade-in">
      <div className="p-6 border-b border-gray-200">
         <h2 className="text-sm font-bold text-gray-900 uppercase">READING PART 1</h2>
      </div>
      <div className="p-6 md:p-8 flex-1">
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-1">Question 1 of 5</h3>
          <p className="text-gray-700 text-sm">Read the short text. Choose a word from the list to complete the text. The first one is done for you.</p>
        </div>

        <div className="text-sm leading-loose text-gray-800 max-w-3xl">
          {renderPassage()}
        </div>
      </div>
    </div>
  );
};

export default Part1GapFilling;
