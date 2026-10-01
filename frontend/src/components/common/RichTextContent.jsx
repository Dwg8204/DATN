import { memo, useMemo } from 'react';
import { sanitizeRichText, toRichTextHtml } from './richText';
import styles from './RichTextContent.module.css';

function RichTextContent({ value, as: Element = 'div', className = '' }) {
  const html = useMemo(() => sanitizeRichText(toRichTextHtml(value)), [value]);
  return <Element className={`${styles.content} ${className}`} dangerouslySetInnerHTML={{ __html: html }}/>;
}

export default memo(RichTextContent);
