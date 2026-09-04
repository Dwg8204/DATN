import { useLayoutEffect, useRef, useState } from 'react';
import { AdminToast } from '../components/AdminFeedback';
import { countWords, withinTextLimit } from './textLimits';
import styles from './BuilderFields.module.css';

export function Field({ label, value, onChange, multiline = false, maxWords = multiline ? 500 : 50, stacked = false, ...props }) {
  const ref = useRef(null);
  const [notice, setNotice] = useState('');

  useLayoutEffect(() => {
    const node = ref.current;
    if (!multiline) return undefined;
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
  }, [value, multiline]);

  const change = event => {
    const next = event.target.value;
    if (!withinTextLimit(next, maxWords) && next.length >= (value || '').length) {
      setNotice(`Maximum ${maxWords} words. Shorten the text before adding more.`);
      return;
    }
    setNotice('');
    onChange(next);
  };

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
    <select value={value} onChange={event => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>;
}

export function Card({ title, children }) {
  return <section className={styles.card}><h3>{title}</h3>{children}</section>;
}
