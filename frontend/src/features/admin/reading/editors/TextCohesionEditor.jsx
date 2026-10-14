import { useUiTranslation } from "../../../../i18n/useUiTranslation.jsx";
import { useRef } from 'react';
import ExplanationField from '../../shared-test-builder/ExplanationField';
import CollapsibleGroup, { CollapsibleToolbar } from '../../shared-test-builder/CollapsibleGroup';
import { Field } from '../components/EditorFields';
import { getPart2Texts } from '../../../module-reading/utils/part2Texts';

export default function TextCohesionEditor({ value, onChange }) {
  const ui = useUiTranslation();
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
    <p>{ui("Enter two texts in the correct reading order. Sentence 1 of each text is given; sentences 2–6 are shuffled for candidates.")}</p>
    <div ref={scopeRef}><CollapsibleToolbar scopeRef={scopeRef}/>{texts.map((text, textIndex) => <section key={text.id || textIndex}>
      <h3>{ ui("Text") + ' ' }{textIndex + 1}</h3>
      <Field label={ui("Text {{value0}} title", {value0:(textIndex + 1)})} value={text.title} onChange={title => updateText(textIndex, { title })}/>
      {[...text.sentences].sort((a, b) => a.correctPosition - b.correctPosition).map((sentence, index) =>
        <CollapsibleGroup key={sentence.id} title={index === 0 ? ui("Text {{value0}} · Sentence 1 — given example", {value0:(textIndex + 1)}) : ui("Text {{value0}} · Sentence {{value1}}", {value0:(textIndex + 1),value1:(index + 1)})} summary={sentence.content || 'Sentence content required'} status={sentence.content?.trim() ? 'Complete' : 'Incomplete'} defaultOpen={textIndex === 0 && index === 0}>
          <Field label={ui("Sentence content")} multiline maxWords={100} value={sentence.content} onChange={content => updateSentence(textIndex, sentence.id, { content })}/>
          {index > 0 && <ExplanationField value={sentence.explanation} onChange={explanation => updateSentence(textIndex, sentence.id, { explanation })}/>}
        </CollapsibleGroup>)}
    </section>)}
    </div>
  </>;
}
