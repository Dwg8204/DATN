import styles from '../components/ReadingEditor.module.css';
import { useRef } from 'react';
import AnswerOptionsEditor from '../../shared-test-builder/AnswerOptionsEditor';
import CollapsibleGroup, { CollapsibleToolbar } from '../../shared-test-builder/CollapsibleGroup';
import PassageComposer from '../components/PassageComposer';

export default function GapFillingEditor({ value, onChange }) {
  const scopeRef = useRef(null);
  const updateQuestion = (index, patch) => onChange({ ...value, questions: value.questions.map((question, current) => current === index ? { ...question, ...patch } : question) });
  const createGapAnswer = (position, selectedText) => {
    if (!selectedText) return;
    const index = value.questions.findIndex(question => question.position === position);
    if (index < 0) return;
    const question = value.questions[index];
    if (question.options.some(Boolean)) return;
    updateQuestion(index, { options: [selectedText, '', ''], answer: selectedText });
  };
  const clearGapAnswer = position => {
    const index = value.questions.findIndex(question => question.position === position);
    if (index >= 0) updateQuestion(index, { options: ['', '', ''], answer: '' });
  };
  return <>
    <div className={styles.editorHelp}><strong>Build one complete passage</strong><p>Format the text naturally and insert exactly five gaps. Gap numbers are maintained automatically.</p></div>
    <PassageComposer value={value} onChange={onChange} onGapCreated={createGapAnswer} onGapRemoved={clearGapAnswer}/>
    <h2>Answer options</h2>
    <div ref={scopeRef}>
      <CollapsibleToolbar scopeRef={scopeRef}/>
      {value.questions.map((question, index) => <CollapsibleGroup key={question.id} title={`Gap ${question.position}`} summary={question.options.filter(Boolean).join(' · ') || 'Three answer options required'} status={question.options.every(Boolean) && question.answer ? 'Complete' : 'Incomplete'} defaultOpen={index === 0}>
        <AnswerOptionsEditor options={question.options} answer={question.answer} onOptionsChange={options => updateQuestion(index, { options })} onAnswerChange={answer => updateQuestion(index, { answer })} explanation={question.explanation} onExplanationChange={explanation => updateQuestion(index, { explanation })}/>
      </CollapsibleGroup>)}
    </div>
  </>;
}
