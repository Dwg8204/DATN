import React, { useContext, useMemo, useState } from 'react';
import { shuffleSentences } from '../../../utils/shuffleSentences';
import { ReadingTestContext } from '../../../context/ReadingTestContext';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import RichTextContent from '../../../../../components/common/RichTextContent';
import styles from './Part2TextCohesion.module.css';
import { getPart2Texts } from '../../../utils/part2Texts';

const DraggableSentence = ({ id, sentence, isSelected, onSelect }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: id,
    data: { type: 'sentence', sentence }
  });

  return (
    <div 
      ref={setNodeRef} 
      {...listeners} 
      {...attributes}
      onClick={() => onSelect(id)}
      className={`bg-white border rounded-lg p-4 my-3 flex items-center cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-sm transition-all w-full min-h-[60px] touch-none ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
      } ${isDragging ? 'opacity-30' : ''}`}
    >
      <RichTextContent className="text-sm font-medium text-gray-800 flex-1" value={sentence.content}/>
      <GripVertical className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
    </div>
  );
};

const DroppableGap = ({
  id,
  droppedSentence,
  onPlace,
  onSelectPlaced,
  hasSelectedSentence,
  isSelected,
}) => {
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: `gap-${id}`,
    data: { type: 'gap', position: id }
  });
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    isDragging,
  } = useDraggable({
    id: droppedSentence?.id || `empty-gap-${id}`,
    data: { type: 'sentence', sentence: droppedSentence },
    disabled: !droppedSentence,
  });

  const setNodeRef = (node) => {
    setDroppableNodeRef(node);
    setDraggableNodeRef(node);
  };

  if (droppedSentence) {
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={() => hasSelectedSentence ? onPlace(id) : onSelectPlaced(droppedSentence.id)}
        className={`bg-[#F3D5B5] border rounded-lg px-4 py-3 min-h-[60px] w-full flex items-center shadow-inner relative my-3 cursor-grab active:cursor-grabbing touch-none transition-colors ${
          isSelected || isOver ? 'border-blue-500 ring-2 ring-blue-200' : 'border-black'
        } ${isDragging ? 'opacity-30' : ''}`}
      >
        <RichTextContent className="text-sm font-semibold text-black flex-1" value={droppedSentence.content}/>
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef}
      onClick={() => hasSelectedSentence && onPlace(id)}
      className={`min-h-[60px] w-full border-2 rounded-lg px-4 py-3 my-3 text-sm transition-colors flex items-center shadow-inner ${
        isOver || hasSelectedSentence ? 'border-blue-400 border-solid bg-blue-50 text-blue-500' : 'border-gray-200 border-solid bg-gray-100 text-gray-400'
      }`}
    >
      {isOver ? 'Drop here' : hasSelectedSentence ? 'Tap to place the selected sentence' : ''}
    </div>
  );
};

const CohesionText = ({ data, questionStart }) => {
  const shuffled = useMemo(() => shuffleSentences(data?.sentences || []), [data?.sentences]);
  const { answers, handleSentencePlacement, renderAnswerReveal } = useContext(ReadingTestContext);
  const [activeId, setActiveId] = useState(null);
  const [selectedSentenceId, setSelectedSentenceId] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  if (!data) return null;

  const handleDragStart = (event) => {
    setSelectedSentenceId(null);
    setActiveId(event.active.id);
  };

  const placeSentence = (sentenceId, position) => {
    if (!sentenceId) return;

    handleSentencePlacement(sentenceId, position, data.sentences);
    setSelectedSentenceId(null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && over.data.current?.type === 'gap') {
      placeSentence(active.id, over.data.current.position);
    }
  };

  const handleSentenceSelect = (sentenceId) => {
    setSelectedSentenceId((currentId) => currentId === sentenceId ? null : sentenceId);
  };

  const activeSentence = activeId ? data.sentences.find(s => s.id === activeId) : null;
  const openingSentence = data.sentences.find(s => s.correctPosition === 1);
  const availableSentences = shuffled.filter(s => !answers[s.id]);

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin}
      onDragStart={handleDragStart} onDragEnd={handleDragEnd}
      onDragCancel={() => { setActiveId(null); setSelectedSentenceId(null); }}>
      <div className="flex flex-col h-full bg-transparent animate-in fade-in">
        
        <div className="py-2 sm:py-6 flex-1 flex flex-col md:flex-row gap-6 md:gap-10">
          
          {/* Left: Gaps */}
          <div className="w-full md:w-1/2 flex flex-col">
            <div className="mb-4">
              <h3 className={`font-bold text-gray-900 mb-1 ${styles.taskTitle}`}>Questions {questionStart}–{questionStart + 4}</h3>
              <p className={`font-bold text-gray-800 text-sm ${styles.taskTitle}`}>{data.title || "Report on the noise level"}</p>
              <p className="mt-2 text-xs text-gray-600 md:hidden">
                On mobile, tap a sentence, then tap a position. Tap a placed sentence and another position to swap them.
              </p>
            </div>
            
            <div className="flex-1 w-full space-y-2">
              {/* The opening sentence is fixed and is not a draggable answer. */}
              <div className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 min-h-[60px] w-full flex items-center shadow-inner my-3">
                <RichTextContent className="text-sm font-medium text-gray-800" value={openingSentence?.content}/>
              </div>
              
              {/* Droppable gaps */}
              {[2, 3, 4, 5, 6].map(position => {
                const sentence = data.sentences.find(s => s.correctPosition !== 1 && answers[s.id] === position);
                const questionId = questionStart + position - 2;
                return (
                  <div key={position} id={`question-${questionId}`} className="transition-all duration-300 rounded p-1">
                    <DroppableGap
                      id={position}
                      droppedSentence={sentence}
                      onPlace={(gapPosition) => placeSentence(selectedSentenceId, gapPosition)}
                      onSelectPlaced={handleSentenceSelect}
                      hasSelectedSentence={Boolean(selectedSentenceId)}
                      isSelected={selectedSentenceId === sentence?.id}
                    />
                    {renderAnswerReveal?.({ position, sentenceId: sentence?.id, textId: data.id })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Available Sentences */}
          <div className="w-full md:w-1/2 flex flex-col pt-0 md:pt-12">
            <div className="flex-1">
              {availableSentences.length === 0 ? (
                <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                  <p className="text-gray-500 font-medium text-sm">All sentences placed!</p>
                </div>
              ) : (
                availableSentences.map(sentence => (
                  <DraggableSentence
                    key={sentence.id}
                    id={sentence.id}
                    sentence={sentence}
                    isSelected={selectedSentenceId === sentence.id}
                    onSelect={handleSentenceSelect}
                  />
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeSentence ? (
          <div className="bg-white border-2 border-blue-400 shadow-xl rounded-lg p-4 flex items-center opacity-90 scale-105 cursor-grabbing min-h-[60px] w-[min(400px,calc(100vw-32px))]">
            <RichTextContent className="text-sm font-medium text-gray-900 flex-1" value={activeSentence.content}/>
            <GripVertical className="w-4 h-4 text-blue-500 ml-2 flex-shrink-0" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

const Part2TextCohesion = ({ data }) => {
  const texts = getPart2Texts(data);
  return (
    <div className="flex flex-col gap-10">
      {texts.map((text, index) => (
        <CohesionText key={text.id || index} data={text} questionStart={6 + index * 5} />
      ))}
    </div>
  );
};

export default Part2TextCohesion;
