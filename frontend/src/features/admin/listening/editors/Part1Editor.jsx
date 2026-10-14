import { useUiTranslation } from "../../../../i18n/useUiTranslation.jsx";
import { useRef } from 'react';
import AudioField from '../../shared-test-builder/AudioField';
import { MultipleChoiceQuestionEditor, QuestionGroup } from '../../shared-test-builder/ObjectiveQuestionEditors';
import { CollapsibleToolbar } from '../../shared-test-builder/CollapsibleGroup';

export default function Part1Editor({ value, onChange }) {
  const ui = useUiTranslation();
  const scopeRef = useRef(null);
  const update = (index, question) => onChange({ ...value, questions: value.questions.map((item, current) => current === index ? question : item) });
  return <div ref={scopeRef}>
    <CollapsibleToolbar scopeRef={scopeRef}/>
    {value.questions.map((question, index) => <QuestionGroup key={question.id} title={ui("Question {{value0}}", {value0:(index + 1)})} summary="Short audio · choose A, B or C" defaultOpen={index === 0}>
      <AudioField maxSizeMb={5} label={ui("Question {{value0}} audio", {value0:(index + 1)})} value={question.audioUrl} onChange={audioUrl => update(index, { ...question, audioUrl })}/>
      <MultipleChoiceQuestionEditor question={question} index={index} onChange={next => update(index, next)}/>
    </QuestionGroup>)}
  </div>;
}
