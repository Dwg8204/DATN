import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { hasRichTextContent, richTextToPlainText } from '../../../components/common/richText';
import { AdminValidationToast } from '../components/AdminFeedback';
import CollapsibleGroup, { CollapsibleToolbar } from '../shared-test-builder/CollapsibleGroup';
import EditorBackButton from '../shared-test-builder/EditorBackButton';
import { revealFirstEditorError } from '../shared-test-builder/editorNavigation';
import RichTextEditor from '../shared-test-builder/RichTextEditor';
import { useWritingTestBuilder } from './context/WritingTestBuilderContext';
import { WRITING_PART_META } from './data/writingBuilderInitialState';
import { hasValidationErrors, validateWritingPart } from './validation/writingTestValidation';
import styles from './WritingPartEditorPage.module.css';

const summary = value => richTextToPlainText(value) || 'Content required';

function Part1({ part, update }) {
  const scopeRef = useRef(null);
  const updateList = (field, index, value) => update(field, part[field].map((item, current) => current === index ? value : item));
  return <>
    <RichTextEditor label="Context" value={part.context} onChange={value => update('context', value)} maxWords={150}/>
    <section className={styles.questions} ref={scopeRef}><h3>Questions and sample answers</h3><CollapsibleToolbar scopeRef={scopeRef}/>
      {part.questions.map((question, index) => <CollapsibleGroup key={index} title={`Question ${index + 1}`} summary={summary(question)} status={hasRichTextContent(question) && part.sampleAnswers[index]?.trim() ? 'Complete' : 'Incomplete'} defaultOpen={index === 0}>
        <article className={styles.questionEditor}><RichTextEditor label={`Question ${index + 1}`} value={question} onChange={value => updateList('questions', index, value)} maxWords={80}/><label><b>SAMPLE ANSWER {index + 1}</b><input value={part.sampleAnswers[index]} onChange={event => updateList('sampleAnswers', index, event.target.value)} placeholder="Enter a 1–5 word sample answer..."/></label></article>
      </CollapsibleGroup>)}
    </section>
  </>;
}

function Part2({ part, update }) {
  return <>
    <CollapsibleGroup title="Instructions and question" summary={summary(part.prompt)} status={hasRichTextContent(part.instruction) && hasRichTextContent(part.prompt) ? 'Complete' : 'Incomplete'} defaultOpen><RichTextEditor label="Instruction" value={part.instruction} onChange={value => update('instruction', value)} maxWords={150}/><RichTextEditor label="Question prompt" value={part.prompt} onChange={value => update('prompt', value)} maxWords={100}/></CollapsibleGroup>
    <CollapsibleGroup title="Sample answer" summary={summary(part.sampleAnswer)} status={hasRichTextContent(part.sampleAnswer) ? 'Complete' : 'Incomplete'}><RichTextEditor label="Sample answer" value={part.sampleAnswer} onChange={value => update('sampleAnswer', value)} maxWords={80} minHeight={220}/></CollapsibleGroup>
  </>;
}

function Part3({ part, update }) {
  const scopeRef = useRef(null);
  const updateList = (field, index, value) => update(field, part[field].map((item, current) => current === index ? value : item));
  return <>
    <RichTextEditor label="Context" value={part.context} onChange={value => update('context', value)} maxWords={150}/>
    <section className={styles.memberList} ref={scopeRef}><h3>Questions and sample responses</h3><CollapsibleToolbar scopeRef={scopeRef}/>
      {part.messages.map((message, index) => <CollapsibleGroup key={index} title={`Member ${index + 1}`} summary={summary(message)} status={hasRichTextContent(message) && hasRichTextContent(part.sampleAnswers[index]) ? 'Complete' : 'Incomplete'} defaultOpen={index === 0}><article><RichTextEditor label="Member message (prompt)" value={message} onChange={value => updateList('messages', index, value)} maxWords={100}/><RichTextEditor label="Sample response" value={part.sampleAnswers[index]} onChange={value => updateList('sampleAnswers', index, value)} maxWords={80}/></article></CollapsibleGroup>)}
    </section>
  </>;
}

function Part4({ part, update }) {
  return <>
    <RichTextEditor label="Context" value={part.context} onChange={value => update('context', value)} maxWords={150}/>
    <CollapsibleGroup title="Informal email" summary={summary(part.informalPrompt)} status={hasRichTextContent(part.informalPrompt) && hasRichTextContent(part.informalSample) ? 'Complete' : 'Incomplete'} defaultOpen><section className={styles.emailSection}><RichTextEditor label="Prompt (40–50 words)" value={part.informalPrompt} onChange={value => update('informalPrompt', value)} maxWords={100}/><RichTextEditor label="Sample informal email" value={part.informalSample} onChange={value => update('informalSample', value)} maxWords={100}/></section></CollapsibleGroup>
    <CollapsibleGroup title="Formal email" summary={summary(part.formalPrompt)} status={hasRichTextContent(part.formalPrompt) && hasRichTextContent(part.formalSample) ? 'Complete' : 'Incomplete'}><section className={styles.emailSection}><RichTextEditor label="Prompt (120–150 words)" value={part.formalPrompt} onChange={value => update('formalPrompt', value)} maxWords={180}/><RichTextEditor label="Sample formal email" value={part.formalSample} onChange={value => update('formalSample', value)} maxWords={220} minHeight={260}/></section></CollapsibleGroup>
  </>;
}

export default function WritingPartEditorPage() {
  const navigate = useNavigate();
  const { partNumber: rawPartNumber } = useParams();
  const partNumber = Math.min(4, Math.max(1, Number(rawPartNumber) || 1));
  const { test, updatePart, basePath } = useWritingTestBuilder();
  const part = test.parts[partNumber];
  const meta = WRITING_PART_META[partNumber - 1];
  const [errors, setErrors] = useState({});
  const update = (field, value) => updatePart(partNumber, field, value);
  const close = () => navigate(basePath);
  const save = () => {
    const nextErrors = validateWritingPart(partNumber, part);
    setErrors(nextErrors);
    if (!hasValidationErrors(nextErrors)) close();
    else revealFirstEditorError(nextErrors);
  };
  const props = { part, update };
  return <div className={styles.overlay}>
    <AdminValidationToast errors={errors} onClose={() => setErrors({})}/>
    <main><EditorBackButton onClick={close}/><header><strong>Part {partNumber}</strong><span>{meta.title} ({meta.summary})</span></header>{partNumber === 1 && <Part1 {...props}/>} {partNumber === 2 && <Part2 {...props}/>} {partNumber === 3 && <Part3 {...props}/>} {partNumber === 4 && <Part4 {...props}/>}</main>
    <button className={styles.save} onClick={save}>Save change</button>
  </div>;
}
