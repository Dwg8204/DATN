import { useContext } from 'react';
import AnswerSelect from '../../../../../components/common/AnswerSelect';
import { ReadingTestContext } from '../../../context/ReadingTestContext';

const Part3OpinionMatch = ({ data }) => {
  const { answers, handleAnswerChange } = useContext(ReadingTestContext);
  if (!data) return null;

  return (
    <div className="flex flex-col h-full bg-transparent animate-in fade-in">
      <div className="py-2 sm:py-6 md:py-8 flex-1 flex flex-col md:flex-row gap-6 md:gap-10">
        <div className="w-full md:w-1/2 flex flex-col rounded-lg border border-gray-100 bg-white p-3 md:rounded-none md:border-0 md:border-b-0 md:border-r md:bg-transparent md:p-0 pb-5 md:pb-0 pr-0 md:pr-6">
          <h3 className="font-bold text-gray-900 mb-4 text-sm">Posts</h3>
          <div className="space-y-6 text-sm text-gray-800 leading-relaxed max-h-[360px] md:max-h-[500px] overflow-y-auto pr-2 md:pr-4 whitespace-pre-wrap">{data.passage}</div>
        </div>
        <div className="w-full md:w-1/2 flex flex-col rounded-lg border border-gray-100 bg-white p-3 md:rounded-none md:border-0 md:bg-transparent md:p-0">
          <h3 className="font-bold text-gray-900 mb-6">Questions</h3>
          <div className="space-y-4">
            {data.questions.map((question, index) => (
              <div key={question.id} id={`question-${index + 11}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm rounded border border-gray-100 p-3 sm:border-0 sm:p-0">
                <span className="text-gray-800 flex-1">{index + 1}. {question.statement}</span>
                <AnswerSelect
                  value={answers[question.id] || ''}
                  onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                  className="w-full sm:w-[150px] flex-shrink-0"
                  options={data.speakers || []}
                  placeholder={`Question ${index + 11}`}
                  ariaLabel={`Answer for question ${index + 1}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Part3OpinionMatch;
