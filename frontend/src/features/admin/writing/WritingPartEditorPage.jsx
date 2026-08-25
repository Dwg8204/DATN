import { useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWritingTestBuilder } from './context/WritingTestBuilderContext';
import { WRITING_PART_META } from './data/writingBuilderInitialState';
import { hasValidationErrors, validateWritingPart } from './validation/writingTestValidation';
import styles from './WritingPartEditorPage.module.css';

function RichBox({ label, value, onChange, className = '' }) {
  return <label className={`${styles.richField} ${className}`}><b>{label}</b><div className={styles.rich}><textarea value={value} onChange={(event) => onChange(event.target.value)} /></div></label>;
}

function Part1({ part, update }) {
  const updateQuestion = (index, value) => update('questions', part.questions.map((question, current) => current === index ? value : question));
  return <><RichBox label="Context" value={part.context} onChange={(value) => update('context', value)} /><section className={styles.questions}><h3>Questions (Word Completion)</h3><div>{part.questions.map((question, index) => <label key={index}><b>QUESTION {index + 1}</b><input value={question} onChange={(event) => updateQuestion(index, event.target.value)} placeholder={`Enter Question ${index + 1} content...`} /></label>)}</div></section></>;
}

function Part2({ part, update }) {
  return <><RichBox label="The content of the exam question" value={part.instruction || part.prompt} onChange={(value) => update('instruction', value)} /><RichBox label="Sample essay" className={styles.essay} value={part.sampleAnswer} onChange={(value) => update('sampleAnswer', value)} /></>;
}

function Part3({ part, update }) {
  const updateMessage = (index, value) => update('messages', part.messages.map((message, current) => current === index ? value : message));
  return <><RichBox label="Context" value={part.context} onChange={(value) => update('context', value)} /><section className={styles.memberList}><h3>Question</h3>{part.messages.map((message, index) => <article key={index}><span>MEMBER {index + 1}</span><b>MEMBER MESSAGE (PROMPT)</b><input value={message} onChange={(event) => updateMessage(index, event.target.value)} placeholder="Enter member's prompt..." /></article>)}</section></>;
}

function Part4({ part, update }) {
  return <><RichBox label="Context" value={part.context} onChange={(value) => update('context', value)} /><RichBox label="Email 1 — Informal (40–50 words)" value={part.informalPrompt} onChange={(value) => update('informalPrompt', value)} /><RichBox label="Email 2 — Formal (120–150 words)" className={styles.essay} value={part.formalPrompt} onChange={(value) => update('formalPrompt', value)} /></>;
}

export default function WritingPartEditorPage() {
  const navigate = useNavigate();
  const { partNumber: rawPartNumber } = useParams();
  const partNumber = Math.min(4, Math.max(1, Number(rawPartNumber) || 1));
  const { test, updatePart } = useWritingTestBuilder();
  const part = test.parts[partNumber];
  const meta = WRITING_PART_META[partNumber - 1];
  const [errors, setErrors] = useState({});
  const update = (field, value) => updatePart(partNumber, field, value);
  const save = () => { const nextErrors = validateWritingPart(partNumber, part); setErrors(nextErrors); if (!hasValidationErrors(nextErrors)) navigate('/admin/tests/new/writing'); };
  const props = { part, update };

  return <div className={styles.overlay}><button className={styles.close} onClick={() => navigate('/admin/tests/new/writing')} aria-label="Close"><X /></button><main><header><strong>Part {partNumber}</strong><span>{meta.title} ({meta.summary})</span></header>{partNumber === 1 && <Part1 {...props} />}{partNumber === 2 && <Part2 {...props} />}{partNumber === 3 && <Part3 {...props} />}{partNumber === 4 && <Part4 {...props} />}{Object.keys(errors).length > 0 && <p className={styles.error}>Please complete all required content before saving.</p>}</main><button className={styles.save} onClick={save}>Save change</button></div>;
}
