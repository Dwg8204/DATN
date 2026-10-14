import { useUiTranslation } from "../../i18n/useUiTranslation.jsx";
import styles from './InstructionBlock.module.css';
import RichTextContent from './RichTextContent';

export default function InstructionBlock({ title, children, className = '' }) {
  const ui = useUiTranslation();
  return (
    <div className={`${styles.instructionBlock} ${className}`}>
      <span className={styles.instructionTitle}>{ui(title)}</span>
      {typeof children === 'string' ? <RichTextContent className={styles.instructionText} value={children}/> : <span className={styles.instructionText}>{children}</span>}
    </div>
  );
}
