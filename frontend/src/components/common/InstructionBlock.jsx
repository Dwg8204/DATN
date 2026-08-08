import styles from './InstructionBlock.module.css';

export default function InstructionBlock({ title, children, className = '' }) {
  return (
    <div className={`${styles.instructionBlock} ${className}`}>
      <span className={styles.instructionTitle}>{title}</span>
      <span className={styles.instructionText}>{children}</span>
    </div>
  );
}
