import { useRef } from 'react';
import ExplanationField from '../../shared-test-builder/ExplanationField';
import CollapsibleGroup, { CollapsibleToolbar } from '../../shared-test-builder/CollapsibleGroup';
import { Field, Choice } from '../components/EditorFields';

export default function HeadingMatchingEditor({ value, onChange }) {
  const scopeRef = useRef(null);
  const headings = value.headings.slice(0, 7);
  const updateParagraph = (index, content) => onChange({ ...value, paragraphs: value.paragraphs.map((item, current) => current === index ? { ...item, content } : item) });
  const updateHeading = (index, patch) => onChange({ ...value, headings: headings.map((item, current) => current === index ? { ...item, ...patch } : item) });
  return <>
    <Field label="Passage title" value={value.title} onChange={title => onChange({ ...value, title })}/>
    <p>Create exactly seven headings and match one unique heading to each paragraph.</p>
    <div ref={scopeRef}><CollapsibleToolbar scopeRef={scopeRef}/>
      {value.paragraphs.map((paragraph, index) => <CollapsibleGroup key={paragraph.id} title={paragraph.label} summary={paragraph.content || 'Paragraph content required'} status={paragraph.content?.trim() ? 'Complete' : 'Incomplete'} defaultOpen={index === 0}>
        <Field label="Paragraph content" multiline value={paragraph.content} onChange={content => updateParagraph(index, content)}/>
      </CollapsibleGroup>)}
      {headings.map((heading, index) => <CollapsibleGroup key={heading.id} title={`Heading ${index + 1}`} summary={heading.text || 'Heading and paragraph required'} status={heading.text?.trim() && heading.correctParagraph ? 'Complete' : 'Incomplete'}>
        <Field label="Heading text" value={heading.text} onChange={text => updateHeading(index, { text })}/>
        <Choice label="Correct paragraph" value={heading.correctParagraph || ''} onChange={correctParagraph => updateHeading(index, { correctParagraph })} options={value.paragraphs.map(paragraph => ({value:paragraph.id,label:paragraph.label}))}/>
        <ExplanationField value={heading.explanation} onChange={explanation => updateHeading(index, { explanation })}/>
      </CollapsibleGroup>)}
    </div>
  </>;
}
