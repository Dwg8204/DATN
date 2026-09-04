import { useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWritingTestBuilder } from './context/WritingTestBuilderContext';
import { WRITING_PART_META } from './data/writingBuilderInitialState';
import { hasValidationErrors, validateWritingPart } from './validation/writingTestValidation';
import styles from './WritingPartEditorPage.module.css';
import { AdminValidationToast } from '../components/AdminFeedback';

function TextAreaField({ label, value, onChange, large = false }) {
  return <label className={`${styles.richField} ${large ? styles.essay : ''}`}><b>{label}</b><div className={styles.rich}><textarea value={value} onChange={(event) => onChange(event.target.value)} /></div></label>;
}

function Part1({ part, update }) {
  const updateList = (field, index, value) => update(field, part[field].map((item, current) => current === index ? value : item));
  return <><TextAreaField label="Context" value={part.context} onChange={(value) => update('context', value)} /><section className={styles.questions}><h3>Questions and sample answers</h3><div>{part.questions.map((question, index) => <article className={styles.questionEditor} key={index}><label><b>QUESTION {index + 1}</b><input value={question} onChange={(event) => updateList('questions', index, event.target.value)} placeholder={`Enter Question ${index + 1} content...`} /></label><label><b>SAMPLE ANSWER {index + 1}</b><input value={part.sampleAnswers[index]} onChange={(event) => updateList('sampleAnswers', index, event.target.value)} placeholder="Enter a sample answer..." /></label></article>)}</div></section></>;
}

function Part2({ part, update }) {
  return <><TextAreaField label="Instruction" value={part.instruction} onChange={(value) => update('instruction', value)} /><TextAreaField label="Question prompt" value={part.prompt} onChange={(value) => update('prompt', value)} /><TextAreaField label="Sample answer" large value={part.sampleAnswer} onChange={(value) => update('sampleAnswer', value)} /></>;
}

function Part3({ part, update }) {
  const updateList = (field, index, value) => update(field, part[field].map((item, current) => current === index ? value : item));
  return <><TextAreaField label="Context" value={part.context} onChange={(value) => update('context', value)} /><section className={styles.memberList}><h3>Questions and sample responses</h3>{part.messages.map((message, index) => <article key={index}><span>MEMBER {index + 1}</span><label><b>MEMBER MESSAGE (PROMPT)</b><input value={message} onChange={(event) => updateList('messages', index, event.target.value)} placeholder="Enter member's prompt..." /></label><label><b>SAMPLE RESPONSE</b><textarea value={part.sampleAnswers[index]} onChange={(event) => updateList('sampleAnswers', index, event.target.value)} placeholder="Enter a 30–40 word sample response..." /></label></article>)}</section></>;
}

function Part4({ part, update }) {
  return <><TextAreaField label="Context" value={part.context} onChange={(value) => update('context', value)} /><section className={styles.emailSection}><h3>Informal email</h3><TextAreaField label="Prompt (40–50 words)" value={part.informalPrompt} onChange={(value) => update('informalPrompt', value)} /><TextAreaField label="Sample informal email" value={part.informalSample} onChange={(value) => update('informalSample', value)} /></section><section className={styles.emailSection}><h3>Formal email</h3><TextAreaField label="Prompt (120–150 words)" value={part.formalPrompt} onChange={(value) => update('formalPrompt', value)} /><TextAreaField label="Sample formal email" large value={part.formalSample} onChange={(value) => update('formalSample', value)} /></section></>;
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
  const save = () => { const nextErrors = validateWritingPart(partNumber, part); setErrors(nextErrors); if (!hasValidationErrors(nextErrors)) close(); };
  const props = { part, update };

  return <div className={styles.overlay}><AdminValidationToast errors={errors} onClose={() => setErrors({})} /><button className={styles.close} onClick={close} aria-label="Close"><X /></button><main><header><strong>Part {partNumber}</strong><span>{meta.title} ({meta.summary})</span></header>{partNumber === 1 && <Part1 {...props} />}{partNumber === 2 && <Part2 {...props} />}{partNumber === 3 && <Part3 {...props} />}{partNumber === 4 && <Part4 {...props} />}</main><button className={styles.save} onClick={save}>Save change</button></div>;
}
