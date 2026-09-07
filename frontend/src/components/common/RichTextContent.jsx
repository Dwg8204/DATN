import { sanitizeRichText, toRichTextHtml } from './richText';
import styles from './RichTextContent.module.css';

export default function RichTextContent({ value, as: Element = 'div', className = '' }) {
  return <Element className={`${styles.content} ${className}`} dangerouslySetInnerHTML={{ __html: sanitizeRichText(toRichTextHtml(value)) }}/>;
}
