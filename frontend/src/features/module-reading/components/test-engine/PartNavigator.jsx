import React, { useContext } from 'react';
import { ReadingTestContext } from '../../context/ReadingTestContext';

const PartNavigator = () => {
  const { currentPart, setCurrentPart, answers, testData } = useContext(ReadingTestContext);

  if (!testData) return null;

  const parts = [
    { id: 1, name: 'Part 1', totalQs: testData.part1?.questions?.length || 0, startId: 'p1-q1' },
    { id: 2, name: 'Part 2', totalQs: testData.part2?.sentences?.length || 0, startId: 's1' },
    { id: 3, name: 'Part 3', totalQs: testData.part3?.questions?.length || 0, startId: 'p3-q1' },
    { id: 4, name: 'Part 4', totalQs: testData.part4?.headings?.length || 0, startId: 'h1' }
  ];

  // Helper to calculate answered questions per part
  // In a real app, you'd match the question IDs more robustly
  const countAnswered = (partId) => {
    let count = 0;
    const answeredKeys = Object.keys(answers);
    
    if (partId === 1) count = answeredKeys.filter(k => k.startsWith('p1')).length;
    else if (partId === 2) count = answeredKeys.filter(k => k.startsWith('s')).length;
    else if (partId === 3) count = answeredKeys.filter(k => k.startsWith('p3')).length;
    else if (partId === 4) count = answeredKeys.filter(k => k.startsWith('h')).length;
    
    return count;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex overflow-x-auto">
      {parts.map(part => {
        const isActive = currentPart === part.id;
        const answered = countAnswered(part.id);
        const isComplete = answered === part.totalQs && part.totalQs > 0;
        
        return (
          <button
            key={part.id}
            onClick={() => setCurrentPart(part.id)}
            className={`flex-1 min-w-[100px] flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-all ${
              isActive 
                ? 'bg-[#DA1E21] text-white border border-[#DA1E21]'
                : 'text-[#DA1E21] hover:bg-[#FFF0F1] border border-[#F3B0B1]'
            }`}
          >
            <span className="font-bold text-sm mb-1">{part.name}</span>
            <div className="flex items-center gap-1.5">
              <div className="flex space-x-1">
                {/* Simplified progress indicator */}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isComplete 
                    ? 'bg-green-100 text-green-700' 
                    : isActive 
                      ? 'bg-white text-[#DA1E21] border border-[#F3B0B1] shadow-sm'
                      : 'bg-[#FFF0F1] text-[#DA1E21]'
                }`}>
                  {answered}/{part.totalQs}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default PartNavigator;
