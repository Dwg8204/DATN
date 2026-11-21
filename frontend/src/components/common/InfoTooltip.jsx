import { useId, useState } from 'react';
import styles from './InfoTooltip.module.css';
export default function InfoTooltip({ text, label }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return <span className={styles.wrapper} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); } }}>
    <button type="button" className={styles.trigger} aria-label={label} aria-describedby={open ? id : undefined} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={() => setOpen(true)}>i</button>
    {open && <span role="tooltip" id={id} className={styles.bubble}>{text}</span>}
  </span>;
}
