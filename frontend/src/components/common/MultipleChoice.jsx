import styles from './MultipleChoice.module.css';

export default function MultipleChoice({
  options,
  value,
  onChange,
  name,
  className = '',
}) {
  return (
    <div className={`${styles.optionsList} ${className}`}>
      {options.map((option, index) => {
        const normalized = typeof option === 'object'
          ? option
          : { value: index, label: option };
        const isSelected = value === normalized.value;

        return (
          <label className={styles.optionItem} key={String(normalized.value)}>
            <input
              className={styles.nativeRadio}
              type="radio"
              name={name}
              value={normalized.value}
              checked={isSelected}
              onChange={() => onChange(normalized.value)}
            />
            <span className={`${styles.radioOuter} ${isSelected ? styles.radioOuterSelected : ''}`}>
              {isSelected && <span className={styles.radioInner} />}
            </span>
            <span className={styles.optionText}>{normalized.label}</span>
          </label>
        );
      })}
    </div>
  );
}
