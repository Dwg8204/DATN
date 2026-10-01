import { useRef } from 'react';
import ExplanationField from '../../shared-test-builder/ExplanationField';
import CollapsibleGroup, { CollapsibleToolbar } from '../../shared-test-builder/CollapsibleGroup';
import { Field } from '../components/EditorFields';

export default function TextCohesionEditor({ value, onChange }) {
  const scopeRef = useRef(null);
  const sentences = [...value.sentences].sort((a, b) => a.correctPosition - b.correctPosition);
  const update = (id, patch) => onChange({ ...value, sentences: sentences.map((sentence, index) => ({ ...sentence, ...(sentence.id === id ? patch : {}), correctPosition: index + 1 })) });
  return <>
    <Field label="Text title" value={value.title} onChange={title => onChange({ ...value, title })}/>
    <p>Enter all six sentences in the correct reading order. Sentence 1 is given; sentences 2–6 are shuffled for candidates.</p>
    <div ref={scopeRef}><CollapsibleToolbar scopeRef={scopeRef}/>{sentences.map((sentence, index) =>
      <CollapsibleGroup key={sentence.id} title={index === 0 ? 'Sentence 1 — given example' : `Sentence ${index + 1}`} summary={sentence.content || 'Sentence content required'} status={sentence.content?.trim() ? 'Complete' : 'Incomplete'} defaultOpen={index === 0}>
        <Field label="Sentence content" multiline maxWords={100} value={sentence.content} onChange={content => update(sentence.id, { content })}/>
        {index > 0 && <ExplanationField value={sentence.explanation} onChange={explanation => update(sentence.id, { explanation })}/>}
      </CollapsibleGroup>)}
    </div>
  </>;
}
