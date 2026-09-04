import { useLayoutEffect, useRef, useState } from 'react';
import { countWords, withinTextLimit } from '../utils/textLimits';
import { AdminToast } from '../../components/AdminFeedback';
import styles from './ReadingEditor.module.css';
export function Field({
  label,
  value,
  onChange,
  multiline = false,
  maxWords = multiline ? 500 : 50,
  stacked = false,
  ...props
}) {
  const ref = useRef(null);
  const [notice, setNotice] = useState('');
  useLayoutEffect(() => {
    const node = ref.current;
    const resize = () => {
      node.style.height = 'auto';
      node.style.height = `${node.scrollHeight + 2}px`;
    };
    resize();
    let width = node.clientWidth;
    const observer = new ResizeObserver(() => {
      if (node.clientWidth !== width) { width = node.clientWidth; resize(); }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [value]);
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
    <textarea {...props} ref={ref} rows={multiline ? 4 : 1} style={{ minHeight: multiline ? 125 : 48 }} value={value || ''} onChange={change} />
    <small>{countWords(value)} / {maxWords} words</small>
  </label>;
}
export function Choice({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an answer'
}) {
  return <label className={styles.field}><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}><option value="">{placeholder}</option>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
export function Card({
  title,
  children
}) {
  return <section className={styles.card}><h3>{title}</h3>{children}</section>;
}
