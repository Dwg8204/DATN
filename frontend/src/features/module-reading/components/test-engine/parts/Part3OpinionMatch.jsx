import { useContext } from 'react';
import AnswerSelect from '../../../../../components/common/AnswerSelect';
import { ReadingTestContext } from '../../../context/ReadingTestContext';

const Part3OpinionMatch = ({ data }) => {
  const { answers, handleAnswerChange } = useContext(ReadingTestContext);
  if (!data) return null;

  return (
    <div className="flex flex-col h-full bg-white animate-in fade-in">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-sm font-bold text-gray-900 uppercase mb-2">READING PART 3</h2>
        <p className="text-gray-700 text-sm">Four people respond in the comments section of an online magazine article about advanced level tests. Read the texts and then answer the questions below.</p>
      </div>
      <div className="p-6 md:p-8 flex-1 flex flex-col md:flex-row gap-10">
        <div className="w-full md:w-1/2 flex flex-col border-r border-gray-100 pr-6">
          <h3 className="font-bold text-gray-900 mb-4 text-sm">Posts</h3>
          <div className="space-y-6 text-sm text-gray-800 leading-relaxed max-h-[500px] overflow-y-auto pr-4 whitespace-pre-wrap">{data.passage}</div>
        </div>
        <div className="w-full md:w-1/2 flex flex-col">
          <h3 className="font-bold text-gray-900 mb-6">Questions</h3>
          <div className="space-y-4">
            {data.questions.map((question, index) => (
              <div key={question.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                <span className="text-gray-800 flex-1">{index + 1}. {question.statement}</span>
                <AnswerSelect
                  value={answers[question.id] || ''}
                  onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                  className="w-[120px] flex-shrink-0"
                  options={data.speakers || []}
                  placeholder="Select"
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
