import styles from './AnswerSelect.module.css';

export default function AnswerSelect({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select an answer',
  className = '',
  status = 'default',
  disabled = false,
  ariaLabel = 'Select an answer',
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${styles.select} ${value !== '' ? styles.hasValue : ''} ${styles[status] || ''} ${className}`}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((option) => {
        const normalized = typeof option === 'object'
          ? option
          : { value: option, label: option };

        return (
          <option key={String(normalized.value)} value={normalized.value}>
            {normalized.label}
          </option>
        );
      })}
    </select>
  );
}
