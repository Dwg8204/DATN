import { useContext } from 'react';
import AnswerSelect from '../../../../../components/common/AnswerSelect';
import { ReadingTestContext } from '../../../context/ReadingTestContext';

const Part4MatchHeading = ({ data }) => {
  const { answers, handleAnswerChange } = useContext(ReadingTestContext);
  if (!data) return null;

  const headingOptions = data.headings.map((heading) => ({ value: heading.id, label: heading.text }));

  return (
    <div className="flex flex-col h-full bg-transparent animate-in fade-in">
      <div className="py-2 sm:py-6 md:py-8 flex-1">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6 text-center">{data.title || 'Mission to Mars'}</h2>
          <div className="space-y-5 sm:space-y-8 text-sm text-gray-800 leading-relaxed">
            {data.paragraphs.map((paragraph, index) => (
              <div key={paragraph.id} id={`question-${index + 18}`} className="flex flex-col sm:flex-row gap-3 items-start rounded border border-gray-100 p-3 sm:border-0 sm:p-0">
                <div className="flex w-full items-center gap-2 mt-1 sm:w-auto">
                  <span className="font-bold text-gray-900">{index + 1}.</span>
                  <AnswerSelect
                    className="flex-1 sm:w-56 sm:flex-none"
                    value={answers[paragraph.id] || ''}
                    onChange={(event) => handleAnswerChange(paragraph.id, event.target.value)}
                    options={headingOptions}
                    placeholder={`Question ${index + 18}`}
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
