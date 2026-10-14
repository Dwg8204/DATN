import { useUiTranslation } from "../../../../i18n/useUiTranslation.jsx";
import { useRef } from 'react';
import AudioField from '../../shared-test-builder/AudioField';
import { Field } from '../../shared-test-builder/BuilderFields';
import CollapsibleGroup, { CollapsibleToolbar } from '../../shared-test-builder/CollapsibleGroup';
import { AnswerRadioGroup } from '../../shared-test-builder/AnswerOptionsEditor';
import ExplanationField from '../../shared-test-builder/ExplanationField';

export default function Part3Editor({ value, onChange }) {
  const ui = useUiTranslation();
  const scopeRef = useRef(null);
  const set = (field, next) => onChange({ ...value, [field]: next });
  const updateOption = (index, text) => {
    const previous = value.options[index];
    onChange({
      ...value,
      options: value.options.map((item, current) => current === index ? text : item),
      statements: value.statements.map(statement => statement.answer === previous ? { ...statement, answer: text } : statement),
    });
  };
  const updateStatement = (index, patch) => set('statements', value.statements.map((item, current) => current === index ? { ...item, ...patch } : item));
  const enteredOptions = value.options.filter(option => option.trim());

  return <>
    <AudioField maxSizeMb={15} label={ui("Part 3 audio")} value={value.audioUrl} onChange={audioUrl => set('audioUrl', audioUrl)}/>
    <Field multiline maxWords={100} label={ui("Context / instruction")} value={value.context} onChange={context => set('context', context)}/>
    <Field label={ui("Question title")} value={value.subTitle} onChange={subTitle => set('subTitle', subTitle)}/>
    <CollapsibleGroup title={ui("Shared opinions")} summary="The same three options are used by all statements" defaultOpen>
      {value.options.map((option, index) => <Field key={index} label={ui("Opinion {{value0}}", {value0:(String.fromCharCode(65 + index))})} value={option} onChange={text => updateOption(index, text)}/>) }
    </CollapsibleGroup>
    <div ref={scopeRef}>
      <CollapsibleToolbar scopeRef={scopeRef}/>
      {value.statements.map((statement, index) => <CollapsibleGroup key={statement.id} title={ui("Statement {{value0}}", {value0:(index + 1)})} summary={statement.text || 'Statement and correct opinion required'} status={statement.text?.trim() && statement.answer ? 'Complete' : 'Incomplete'} defaultOpen={index === 0}>
        <Field multiline maxWords={80} label={ui("Statement")} value={statement.text} onChange={text => updateStatement(index, { text })}/>
        <AnswerRadioGroup options={enteredOptions} value={statement.answer} onChange={answer => updateStatement(index, { answer })} ariaLabel={ui("Correct opinion for statement {{value0}}", {value0:(index + 1)})}/>
        <ExplanationField value={statement.explanation} onChange={explanation => updateStatement(index, { explanation })}/>
      </CollapsibleGroup>)}
    </div>
  </>;
}
