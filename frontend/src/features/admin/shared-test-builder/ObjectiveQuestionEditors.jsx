import { Plus, Trash2 } from 'lucide-react';
import styles from './ObjectiveQuestionEditors.module.css';
import './ObjectiveQuestionEditorsEnhancements.css';

export function MultipleChoiceQuestionEditor({ question, index, onChange }) {
  const updateOption = (optionIndex, value) => onChange({ ...question, options: question.options.map((option, current) => current === optionIndex ? value : option) });
  return <article className={styles.questionCard}><header><strong>Question {index + 1}</strong><span>Single answer</span></header><label>Question<textarea rows="2" value={question.text} onChange={(event) => onChange({ ...question, text: event.target.value })} placeholder="Enter the question..."/></label><div className={styles.options}>{question.options.map((option, optionIndex) => <label key={optionIndex} className={styles.option}><input type="radio" name={`correct-${question.id || index}`} checked={question.correctAnswer === optionIndex} onChange={() => onChange({ ...question, correctAnswer: optionIndex })}/><b>{String.fromCharCode(65 + optionIndex)}</b><textarea rows="2" value={option} onChange={(event) => updateOption(optionIndex, event.target.value)} placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}/></label>)}</div></article>;
}

export function MatchingSetEditor({ set, index, onChange }) {
  const updateTargets = (targetIndex, field, value) => onChange({ ...set, targetWords: set.targetWords.map((target, current) => current === targetIndex ? { ...target, [field]: value } : target) });
  const updateOptions = (optionIndex, value) => onChange({ ...set, options: set.options.map((option, current) => current === optionIndex ? { ...option, text: value } : option) });
  return <article className={styles.matchingCard}><header><div><strong>Vocabulary set {index + 1}</strong><span>5 questions · 10 answer options</span></div></header><label>Instruction<textarea value={set.instruction} onChange={(event) => onChange({ ...set, instruction: event.target.value })}/></label><div className={styles.matchingGrid}><section><h4>Target words and answers</h4>{set.targetWords.map((target, targetIndex) => <div className={styles.targetRow} key={targetIndex}><span>{targetIndex + 1}</span><input value={target.word} onChange={(event) => updateTargets(targetIndex, 'word', event.target.value)} placeholder="Target word"/><select value={target.correctAnswer} onChange={(event) => updateTargets(targetIndex, 'correctAnswer', event.target.value)}>{set.options.map((option) => <option key={option.label} value={option.label}>{option.label}</option>)}</select></div>)}</section><section><h4>Answer bank</h4>{set.options.map((option, optionIndex) => <label className={styles.bankRow} key={option.label}><b>{option.label}</b><input value={option.text} onChange={(event) => updateOptions(optionIndex, event.target.value)} placeholder="Vocabulary option"/></label>)}</section></div></article>;
}

export function QuestionGroup({ title, summary, children, defaultOpen = false }) {
  return <details className={styles.group} open={defaultOpen}><summary><div><strong>{title}</strong><span>{summary}</span></div><Plus/></summary><div className={styles.groupBody}>{children}</div></details>;
}

export function RemoveButton({ onClick, label = 'Remove' }) { return <button className={styles.remove} type="button" onClick={onClick}><Trash2/>{label}</button>; }
