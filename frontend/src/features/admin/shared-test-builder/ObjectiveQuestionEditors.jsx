import { Trash2 } from 'lucide-react';
import AnswerSelect from '../../../components/common/AnswerSelect';
import AnswerOptionsEditor from './AnswerOptionsEditor';
import CollapsibleGroup from './CollapsibleGroup';
import ExplanationField from './ExplanationField';
import RichTextEditor from './RichTextEditor';
import styles from './ObjectiveQuestionEditors.module.css';
import './ObjectiveQuestionEditorsEnhancements.css';

export function MultipleChoiceQuestionEditor({ question, index, onChange }) {
  return <article className={styles.questionCard}>
    <header><strong>Question {index + 1}</strong><span>Single answer</span></header>
    <RichTextEditor label="Question" value={question.text} onChange={text => onChange({ ...question, text })} maxWords={100}/>
    <AnswerOptionsEditor options={question.options} answer={question.correctAnswer} onOptionsChange={options => onChange({ ...question, options })} onAnswerChange={correctAnswer => onChange({ ...question, correctAnswer })} explanation={question.explanation} onExplanationChange={explanation => onChange({ ...question, explanation })}/>
  </article>;
}

export function MatchingSetEditor({ set, index, onChange }) {
  const updateTargets = (targetIndex, field, value) => onChange({ ...set, targetWords: set.targetWords.map((target, current) => current === targetIndex ? { ...target, [field]: value } : target) });
  const updateOptions = (optionIndex, value) => onChange({ ...set, options: set.options.map((option, current) => current === optionIndex ? { ...option, text: value } : option) });
  return <article className={styles.matchingCard}>
    <header><div><strong>Vocabulary set {index + 1}</strong><span>5 questions · 10 answer options</span></div></header>
    <RichTextEditor label="Instruction" value={set.instruction} onChange={instruction => onChange({ ...set, instruction })} maxWords={120}/>
    <div className={styles.matchingGrid}>
      <section><h4>Target words and answers</h4>{set.targetWords.map((target, targetIndex) => <div key={target.id || targetIndex}><div className={styles.targetRow}><span>{targetIndex + 1}</span><input value={target.word} onChange={event => updateTargets(targetIndex, 'word', event.target.value)} placeholder="Target word"/><AnswerSelect value={target.correctAnswer} onChange={event => updateTargets(targetIndex, 'correctAnswer', event.target.value)} options={set.options.map(option => ({ value: option.label, label: option.label }))} ariaLabel={`Correct answer for target ${targetIndex + 1}`}/></div><ExplanationField value={target.explanation} onChange={value => updateTargets(targetIndex, 'explanation', value)}/></div>)}</section>
      <section><h4>Answer bank</h4>{set.options.map((option, optionIndex) => <label className={styles.bankRow} key={option.label}><b>{option.label}</b><input value={option.text} onChange={event => updateOptions(optionIndex, event.target.value)} placeholder="Vocabulary option"/></label>)}</section>
    </div>
  </article>;
}

export function QuestionGroup({ title, summary, status, children, defaultOpen = false }) {
  return <CollapsibleGroup title={title} summary={summary} status={status} defaultOpen={defaultOpen}>{children}</CollapsibleGroup>;
}

export function RemoveButton({ onClick, label = 'Remove' }) {
  return <button className={styles.remove} type="button" onClick={onClick}><Trash2/>{label}</button>;
}
