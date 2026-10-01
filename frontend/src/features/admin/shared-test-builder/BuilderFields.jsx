import { useLayoutEffect, useRef, useState } from 'react';
import { AdminToast } from '../components/AdminFeedback';
import { countWords, withinTextLimit } from './textLimits';
import styles from './BuilderFields.module.css';
import AnswerSelect from '../../../components/common/AnswerSelect';
import RichTextEditor from './RichTextEditor';

export function Field({ label, value, onChange, multiline = false, maxWords = multiline ? 500 : 50, stacked = false, ...props }) {
  const ref = useRef(null);
  const [notice, setNotice] = useState('');
  const useRichEditor = multiline && maxWords >= 20;

  useLayoutEffect(() => {
    const node = ref.current;
    if (!multiline || useRichEditor || !node) return undefined;
    const resize = () => {
      node.style.height = 'auto';
      node.style.height = `${node.scrollHeight + 2}px`;
    };
    resize();
    let width = node.clientWidth;
    const observer = new ResizeObserver(() => {
      if (node.clientWidth !== width) {
        width = node.clientWidth;
        resize();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [value, multiline, useRichEditor]);

  const change = event => {
    const next = event.target.value;
    if (!withinTextLimit(next, maxWords) && next.length >= (value || '').length) {
      setNotice(`Maximum ${maxWords} words. Shorten the text before adding more.`);
      return;
    }
    setNotice('');
    onChange(next);
  };

  if (useRichEditor) return <RichTextEditor label={label} value={value} onChange={onChange} maxWords={maxWords} minHeight={props.rows && props.rows > 5 ? 220 : 145}/>;

  return <label className={styles.field} style={stacked ? { gridTemplateColumns: 'minmax(0, 1fr)' } : undefined}>
    <AdminToast message={notice} type="error" onClose={() => setNotice('')} />
    <span>{label}</span>
    {multiline
      ? <textarea {...props} ref={ref} rows={4} value={value || ''} onChange={change} />
      : <input {...props} ref={ref} value={value || ''} onChange={change} />}
    <small>{countWords(value)} / {maxWords} words</small>
  </label>;
}

export function Choice({ label, value, onChange, options, placeholder = 'Select an answer' }) {
  return <label className={styles.field}>
    <span>{label}</span>
    <AnswerSelect value={value} onChange={event => onChange(event.target.value)} options={options} placeholder={placeholder} ariaLabel={label} />
  </label>;
}

export function Card({ title, children }) {
  return <section className={styles.card}><h3>{title}</h3>{children}</section>;
}
