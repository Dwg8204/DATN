import { useRef } from 'react';
import ExplanationField from '../../shared-test-builder/ExplanationField';
import CollapsibleGroup, { CollapsibleToolbar } from '../../shared-test-builder/CollapsibleGroup';
import { Field, Choice } from '../components/EditorFields';

export default function OpinionMatchingEditor({ value, onChange }) {
  const scopeRef = useRef(null);
  const updateQuestion = (index, patch) => onChange({ ...value, questions: value.questions.map((question, current) => current === index ? { ...question, ...patch } : question) });
  const updateSpeaker = (index, name) => {
    const previous = value.speakers[index];
    onChange({ ...value, speakers: value.speakers.map((speaker, current) => current === index ? name : speaker), questions: value.questions.map(question => question.answer === previous ? { ...question, answer: name } : question) });
  };
  return <div ref={scopeRef}>
    <CollapsibleToolbar scopeRef={scopeRef}/>
    {value.speakers.map((speaker, index) => <CollapsibleGroup key={`speaker-${index}`} title={`Speaker ${index + 1}`} summary={speaker || 'Name and opinion required'} defaultOpen={index === 0}>
      <Field label="Name" value={speaker} onChange={name => updateSpeaker(index, name)}/>
      <Field label="Opinion / post" multiline value={value.posts[index]} onChange={post => onChange({ ...value, posts: value.posts.map((item, current) => current === index ? post : item) })}/>
    </CollapsibleGroup>)}
    {value.questions.map((question, index) => <CollapsibleGroup key={question.id} title={`Statement ${index + 1}`} summary={question.statement || 'Statement and speaker required'} status={question.statement?.trim() && question.answer ? 'Complete' : 'Incomplete'}>
      <Field label="Statement" multiline maxWords={100} value={question.statement} onChange={statement => updateQuestion(index, { statement })}/>
      <Choice label="Correct speaker" value={question.answer} onChange={answer => updateQuestion(index, { answer })} options={value.speakers.filter(Boolean).map(speaker => ({value:speaker,label:speaker}))}/>
      <ExplanationField value={question.explanation} onChange={explanation => updateQuestion(index, { explanation })}/>
    </CollapsibleGroup>)}
  </div>;
}
