import { Minus, Plus } from 'lucide-react';
import styles from './CollapsibleGroup.module.css';
import { richTextToPlainText } from '../../../components/common/richText';

export function CollapsibleToolbar({ scopeRef }) {
  const toggle = open => scopeRef.current?.querySelectorAll('details[data-collapsible]').forEach(item => { item.open = open; });
  return <div className={styles.toolbar}><button type="button" onClick={() => toggle(true)}>Expand all</button><button type="button" onClick={() => toggle(false)}>Collapse all</button></div>;
}

export default function CollapsibleGroup({ title, summary, status, defaultOpen = false, children, className = '', persistenceKey = title }) {
  const routeKey = typeof window === 'undefined' ? '' : window.location.pathname;
  const storageKey = persistenceKey ? `aptimate.editor.group.${routeKey}.${persistenceKey}` : '';
  const savedState = storageKey && typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(storageKey) : null;
  const initialOpen = savedState === null ? defaultOpen : savedState === 'open';
  const rememberState = event => {
    if (storageKey) sessionStorage.setItem(storageKey, event.currentTarget.open ? 'open' : 'closed');
  };
  const summaryText = typeof summary === 'string' ? richTextToPlainText(summary) : summary;
  return <details data-collapsible data-title={title} className={`${styles.group} ${className}`} open={initialOpen} onToggle={rememberState}>
    <summary><div><strong>{title}</strong>{summaryText && <span>{summaryText}</span>}</div>{status && <small className={status.toLowerCase() === 'incomplete' ? styles.incomplete : styles.complete}>{status}</small>}<span className={styles.icons}><Plus className={styles.plus}/><Minus className={styles.minus}/></span></summary>
    <div className={styles.body}>{children}</div>
  </details>;
}
