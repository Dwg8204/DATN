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
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-5 sm:mb-7 text-center">{data.title || 'Mission to Mars'}</h2>
          <div className="space-y-5 sm:space-y-7 text-sm text-gray-800 leading-relaxed">
            {data.paragraphs.map((paragraph, index) => (
              <div key={paragraph.id} id={`question-${index + 18}`} className="flex flex-col gap-3 rounded border border-gray-100 p-3 md:grid md:grid-cols-[260px_minmax(0,1fr)] md:items-start md:gap-6 md:border-0 md:p-0">
                <div className="flex w-full items-center gap-2 md:mt-1">
                  <span className="font-bold text-gray-900">{index + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <AnswerSelect
                      value={answers[paragraph.id] || ''}
                      onChange={(event) => handleAnswerChange(paragraph.id, event.target.value)}
                      options={headingOptions}
                      placeholder={`Question ${index + 18}`}
                      ariaLabel={`Heading for paragraph ${index + 1}`}
                    />
                  </div>
                </div>
                <div className="min-w-0 md:mt-1"><p className="m-0">{paragraph.content}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Part4MatchHeading;
