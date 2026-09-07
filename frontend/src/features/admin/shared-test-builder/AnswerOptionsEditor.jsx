import { useId } from 'react';
import ExplanationField from './ExplanationField';
import styles from './AnswerOptionsEditor.module.css';

export function AnswerRadioGroup({ options, value, onChange, ariaLabel = 'Correct answer' }) {
  const groupId = useId();
  return <div className={styles.picker} role="radiogroup" aria-label={ariaLabel}>
    {options.map((option, index) => {
      const item = typeof option === 'object' ? option : { value: option, label: option };
      return <label key={`${item.value}-${index}`}>
        <input type="radio" name={groupId} checked={String(value) === String(item.value)} onChange={() => onChange(item.value)}/>
        <b>{String.fromCharCode(65 + index)}</b><span>{item.label}</span>
      </label>;
    })}
  </div>;
}

export default function AnswerOptionsEditor({ options, answer, onOptionsChange, onAnswerChange, explanation, onExplanationChange, labels = ['A','B','C'] }) {
  const groupId = useId();
  return <div className={styles.root} role="radiogroup" aria-label="Correct answer">
    {options.map((option, index) => {
      const selected = typeof answer === 'number' ? answer === index : answer === option && Boolean(option);
      return <label className={styles.option} key={labels[index] || index}>
        <input type="radio" name={groupId} checked={selected} onChange={() => onAnswerChange(typeof answer === 'number' ? index : option)} disabled={typeof answer !== 'number' && !option.trim()} />
        <b>{labels[index] || String.fromCharCode(65 + index)}</b>
        <textarea rows="2" value={option} placeholder={`Option ${labels[index] || String.fromCharCode(65 + index)}`} onChange={event => {
          const next = options.map((item, current) => current === index ? event.target.value : item);
          onOptionsChange(next);
          if (typeof answer !== 'number' && selected) onAnswerChange(event.target.value);
        }}/>
      </label>;
    })}
    {onExplanationChange && <ExplanationField value={explanation} onChange={onExplanationChange}/>} 
  </div>;
}
