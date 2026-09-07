import styles from './AnswerExplanation.module.css';
import RichTextContent from './RichTextContent';
import { hasRichTextContent } from './richText';
export default function AnswerExplanation({ text, open }) {
  if (!hasRichTextContent(text)) return null;
  return <details open={open} className={styles.explanation}><summary>Explain</summary><RichTextContent value={text}/></details>;
}
