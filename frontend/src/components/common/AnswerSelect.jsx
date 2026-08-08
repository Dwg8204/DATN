import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const normalizedOptions = useMemo(() => options.map((option) => (
    typeof option === 'object' ? option : { value: option, label: option }
  )), [options]);
  const selectedOption = normalizedOptions.find((option) => String(option.value) === String(value));

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handleSelect = (nextValue) => {
    onChange?.({ target: { value: nextValue } });
    setIsOpen(false);
  };

  return (
    <div ref={rootRef} className={`${styles.selectRoot} ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`${styles.select} ${value !== '' ? styles.hasValue : ''} ${styles[status] || ''}`}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false);
        }}
      >
        <span className={`${styles.selectedText} ${!selectedOption ? styles.placeholder : ''}`}>
          {selectedOption?.label || placeholder}
        </span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} aria-hidden="true" />
      </button>
      {isOpen && !disabled && (
        <div className={styles.menu} role="listbox" aria-label={ariaLabel}>
          {normalizedOptions.map((option) => {
            const isSelected = String(option.value) === String(value);
            return (
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                key={String(option.value)}
                className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
