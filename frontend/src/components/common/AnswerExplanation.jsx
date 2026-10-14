import { useUiTranslation } from "../../i18n/useUiTranslation.jsx";
import styles from './AnswerExplanation.module.css';
import RichTextContent from './RichTextContent';
import { hasRichTextContent } from './richText';
export default function AnswerExplanation({ text, open }) {
  const ui = useUiTranslation();
  if (!hasRichTextContent(text)) return null;
  return <details open={open} className={styles.explanation}><summary>{ui("Explain")}</summary><RichTextContent value={text}/></details>;
}
