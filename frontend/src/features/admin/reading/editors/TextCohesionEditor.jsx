import { useRef } from 'react';
import ExplanationField from '../../shared-test-builder/ExplanationField';
import CollapsibleGroup, { CollapsibleToolbar } from '../../shared-test-builder/CollapsibleGroup';
import { Field } from '../components/EditorFields';
import { getPart2Texts } from '../../../module-reading/utils/part2Texts';

export default function TextCohesionEditor({ value, onChange }) {
  const scopeRef = useRef(null);
  const storedTexts = getPart2Texts(value);
  const texts = storedTexts.length >= 2 ? storedTexts : [...storedTexts, {
    id: 'p2-text2', title: '', sentences: Array.from({ length: 6 }, (_, index) => ({
      id: `p2-t2-s${index + 1}`, content: '', correctPosition: index + 1, explanation: ''
    }))
  }];
  const updateText = (textIndex, patch) => onChange({ texts: texts.map((text, index) => index === textIndex ? { ...text, ...patch } : text) });
  const updateSentence = (textIndex, id, patch) => {
    const sentences = [...texts[textIndex].sentences].sort((a, b) => a.correctPosition - b.correctPosition);
    updateText(textIndex, { sentences: sentences.map((sentence, index) => ({ ...sentence, ...(sentence.id === id ? patch : {}), correctPosition: index + 1 })) });
  };
  return <>
    <p>Enter two texts in the correct reading order. Sentence 1 of each text is given; sentences 2–6 are shuffled for candidates.</p>
    <div ref={scopeRef}><CollapsibleToolbar scopeRef={scopeRef}/>{texts.map((text, textIndex) => <section key={text.id || textIndex}>
      <h3>Text {textIndex + 1}</h3>
      <Field label={`Text ${textIndex + 1} title`} value={text.title} onChange={title => updateText(textIndex, { title })}/>
      {[...text.sentences].sort((a, b) => a.correctPosition - b.correctPosition).map((sentence, index) =>
        <CollapsibleGroup key={sentence.id} title={index === 0 ? `Text ${textIndex + 1} · Sentence 1 — given example` : `Text ${textIndex + 1} · Sentence ${index + 1}`} summary={sentence.content || 'Sentence content required'} status={sentence.content?.trim() ? 'Complete' : 'Incomplete'} defaultOpen={textIndex === 0 && index === 0}>
          <Field label="Sentence content" multiline maxWords={100} value={sentence.content} onChange={content => updateSentence(textIndex, sentence.id, { content })}/>
          {index > 0 && <ExplanationField value={sentence.explanation} onChange={explanation => updateSentence(textIndex, sentence.id, { explanation })}/>}
        </CollapsibleGroup>)}
    </section>)}
    </div>
  </>;
}
