import styles from './StatusBadge.module.css';
export default function StatusBadge({ status }) { const key = status === 'Done' || status === 'Published' ? 'success' : status === 'Draft' ? 'draft' : 'muted'; return <span className={`${styles.badge} ${styles[key]}`}>{status}</span>; }
