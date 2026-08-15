import { useContext } from 'react';
import AnswerSelect from '../../../../../components/common/AnswerSelect';
import { ReadingTestContext } from '../../../context/ReadingTestContext';

const Part1GapFilling = ({ data }) => {
  const { answers, handleAnswerChange } = useContext(ReadingTestContext);
  if (!data) return null;

  const parts = data.passage.split(/(\[\d+\])/g);

  return (
    <div className="flex flex-col h-full bg-white animate-in fade-in">
      <div className="p-3 sm:p-4 flex-1">
        <div className="text-sm leading-7 sm:leading-loose text-gray-800 max-w-3xl break-words">
          {parts.map((part, index) => {
            const match = part.match(/\[(\d+)\]/);
            if (!match) return <span key={index} className="whitespace-pre-wrap">{part}</span>;

            const position = parseInt(match[1]);
            const question = data.questions.find((item) => item.position === position);
            if (!question) return part;

            return (
              <span key={index} id={`question-${position}`} className="inline-flex w-full sm:w-[180px] max-w-full items-center mx-0 sm:mx-2 my-1 align-middle">
                <AnswerSelect
                  value={answers[question.id] || ''}
                  onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                  options={question.options}
                  placeholder={`Gap ${position}`}
                  ariaLabel={`Answer for gap ${position}`}
                />
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Part1GapFilling;
