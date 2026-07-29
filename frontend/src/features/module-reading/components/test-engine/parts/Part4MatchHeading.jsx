import { useContext } from 'react';
import AnswerSelect from '../../../../../components/common/AnswerSelect';
import { ReadingTestContext } from '../../../context/ReadingTestContext';

const Part4MatchHeading = ({ data }) => {
  const { answers, handleAnswerChange } = useContext(ReadingTestContext);
  if (!data) return null;

  const headingOptions = data.headings.map((heading) => ({ value: heading.id, label: heading.text }));

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
          <h2 className="text-lg font-bold text-gray-900 mb-6 text-center">{data.title || 'Mission to Mars'}</h2>
          <div className="space-y-8 text-sm text-gray-800 leading-relaxed">
            {data.paragraphs.map((paragraph, index) => (
              <div key={paragraph.id} className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-gray-900">{index + 1}.</span>
                  <AnswerSelect
                    value={answers[paragraph.id] || ''}
                    onChange={(event) => handleAnswerChange(paragraph.id, event.target.value)}
                    options={headingOptions}
                    placeholder="Select heading"
                    ariaLabel={`Heading for paragraph ${index + 1}`}
                  />
                </div>
                <div className="flex-1 mt-1 sm:mt-0"><p>{paragraph.content}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Part4MatchHeading;
