import React, { useContext } from 'react';
import { ReadingTestContext } from '../../../context/ReadingTestContext';

const Part4MatchHeading = ({ data }) => {
  const { answers, handleAnswerChange } = useContext(ReadingTestContext);

  if (!data) return null;

  return (
    <div className="flex flex-col h-full bg-white animate-in fade-in">
      <div className="p-6 border-b border-gray-200">
         <h2 className="text-sm font-bold text-gray-900 uppercase">READING PART 4</h2>
      </div>

      <div className="p-6 md:p-8 flex-1">
        <div className="mb-8">
          <h3 className="font-bold text-gray-900 mb-1">Question 1 of 5</h3>
          <p className="text-gray-700 text-sm">Read the passage quickly. Choose a heading for each numbered paragraph (1 - 7) from the drop-down box. There is one more heading than you need.</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-bold text-gray-900 mb-6 text-center">{data.title || "Mission to Mars"}</h2>
          
          <div className="space-y-8 text-sm text-gray-800 leading-relaxed">
            {data.paragraphs.map((paragraph, index) => (
              <div key={paragraph.id} className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-gray-900">{index + 1}.</span>
                  <select
                    value={answers[paragraph.id] || ''}
                    onChange={(e) => handleAnswerChange(paragraph.id, e.target.value)}
                    className="appearance-none bg-white border border-gray-300 py-1 pl-2 pr-8 rounded text-sm text-gray-800 focus:outline-none focus:border-blue-500 cursor-pointer min-w-[120px]"
                    style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right .5rem top 50%', backgroundSize: '.65rem auto' }}
                  >
                    <option value="" disabled>- - -</option>
                    {data.headings.map((heading) => (
                      <option key={heading.id} value={heading.id}>{heading.text}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 mt-1 sm:mt-0">
                  <p>{paragraph.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Part4MatchHeading;
