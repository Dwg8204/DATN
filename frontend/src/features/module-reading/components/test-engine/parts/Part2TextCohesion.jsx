import React, { useContext, useState } from 'react';
import { ReadingTestContext } from '../../../context/ReadingTestContext';
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';

const DraggableSentence = ({ id, sentence }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: id,
    data: { type: 'sentence', sentence }
  });

  if (isDragging) {
    return <div ref={setNodeRef} className="opacity-30 border-2 border-dashed border-gray-300 rounded-lg p-3 my-2 h-[60px] bg-gray-50 w-full"></div>;
  }

  return (
    <div 
      ref={setNodeRef} 
      {...listeners} 
      {...attributes}
      className="bg-white border border-gray-300 rounded-lg p-4 my-3 flex items-center cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-sm transition-all w-full min-h-[60px]"
    >
      <span className="text-sm font-medium text-gray-800 flex-1">{sentence.content}</span>
      <GripVertical className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
    </div>
  );
};

const DroppableGap = ({ id, droppedSentence, onRemove }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `gap-${id}`,
    data: { type: 'gap', position: id }
  });

  if (droppedSentence) {
    return (
      <div className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 min-h-[60px] w-full flex items-center shadow-inner relative group my-3">
        <span className="text-sm font-medium text-gray-800 flex-1">{droppedSentence.content}</span>
        <button 
          onClick={() => onRemove(droppedSentence.id)}
          className="ml-2 text-gray-400 hover:text-red-600 font-bold focus:outline-none hidden group-hover:block"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef}
      className={`min-h-[60px] w-full border-2 rounded-lg px-4 py-3 my-3 text-sm transition-colors flex items-center shadow-inner ${
        isOver ? 'border-blue-400 border-solid bg-blue-50 text-blue-500' : 'border-gray-200 border-solid bg-gray-100 text-gray-400'
      }`}
    >
      {isOver ? 'Drop here' : ''}
    </div>
  );
};

const Part2TextCohesion = ({ data }) => {
  const { answers, handleAnswerChange } = useContext(ReadingTestContext);
  const [activeId, setActiveId] = useState(null);

  if (!data) return null;

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && over.data.current?.type === 'gap') {
      const position = over.data.current.position;
      const sentenceId = active.id;
      
      handleAnswerChange(sentenceId, position);
      
      const existingSentenceId = Object.keys(answers).find(key => answers[key] === position);
      if (existingSentenceId && existingSentenceId !== sentenceId) {
         handleAnswerChange(existingSentenceId, null);
      }
    }
  };

  const handleRemove = (sentenceId) => {
    handleAnswerChange(sentenceId, null);
  };

  const activeSentence = activeId ? data.sentences.find(s => s.id === activeId) : null;
  const availableSentences = data.sentences.filter(s => !answers[s.id]);

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full bg-white animate-in fade-in">
        <div className="p-6 border-b border-gray-200">
           <h2 className="text-sm font-bold text-gray-900 uppercase mb-2">READING PART 2</h2>
           <p className="text-gray-700 text-sm">The sentences below are from a report. Put the sentences in the right order. The first sentence is done for you.</p>
        </div>
        
        <div className="p-6 md:p-8 flex-1 flex flex-col md:flex-row gap-10">
          
          {/* Left: Gaps */}
          <div className="w-full md:w-1/2 flex flex-col">
            <div className="mb-4">
              <h3 className="font-bold text-gray-900 mb-1">Question 2 of 5</h3>
              <p className="font-bold text-gray-800 text-sm">{data.title || "Report on the noise level"}</p>
            </div>
            
            <div className="flex-1 w-full space-y-2">
              {/* Fake first sentence done for you */}
              <div className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 min-h-[60px] w-full flex items-center shadow-inner my-3">
                <span className="text-sm font-medium text-gray-800">{data.sentences[0]?.content || "The report provides information about the really problems on the current road."}</span>
              </div>
              
              {/* Droppable gaps */}
              {[2, 3, 4, 5, 6].map(position => {
                const sentenceId = Object.keys(answers).find(key => answers[key] === position);
                const sentence = data.sentences.find(s => s.id === sentenceId);
                return (
                  <DroppableGap key={position} id={position} droppedSentence={sentence} onRemove={handleRemove} />
                );
              })}
            </div>
          </div>

          {/* Right: Available Sentences */}
          <div className="w-full md:w-1/2 flex flex-col pt-12">
            <div className="flex-1">
              {availableSentences.length === 0 ? (
                <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                  <p className="text-gray-500 font-medium text-sm">All sentences placed!</p>
                </div>
              ) : (
                availableSentences.map(sentence => (
                  <DraggableSentence key={sentence.id} id={sentence.id} sentence={sentence} />
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      <DragOverlay>
        {activeSentence ? (
          <div className="bg-white border-2 border-blue-400 shadow-xl rounded-lg p-4 flex items-center opacity-90 scale-105 cursor-grabbing min-h-[60px] w-[400px]">
            <span className="text-sm font-medium text-gray-900 flex-1">{activeSentence.content}</span>
            <GripVertical className="w-4 h-4 text-blue-500 ml-2 flex-shrink-0" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default Part2TextCohesion;
