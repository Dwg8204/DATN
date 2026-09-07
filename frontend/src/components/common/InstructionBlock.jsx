import styles from './InstructionBlock.module.css';
import RichTextContent from './RichTextContent';

export default function InstructionBlock({ title, children, className = '' }) {
  return (
    <div className={`${styles.instructionBlock} ${className}`}>
      <span className={styles.instructionTitle}>{title}</span>
      {typeof children === 'string' ? <RichTextContent className={styles.instructionText} value={children}/> : <span className={styles.instructionText}>{children}</span>}
    </div>
  );
}
