import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { renderAsync } from 'docx-preview';
import styles from './WordDocumentPreview.module.css';

export default function WordDocumentPreview({ source, fileName }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetch(source, { credentials: 'include', signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error(`Unable to load Word file (${response.status})`);
        return response.arrayBuffer();
      })
      .then(async buffer => {
        if (!active || !containerRef.current) return;
        containerRef.current.replaceChildren();
        await renderAsync(buffer, containerRef.current, undefined, {
          className: 'aptimate-docx',
          inWrapper: true,
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false,
        });
        if (active) setStatus('ready');
      })
      .catch(error => {
        if (error.name !== 'AbortError' && active) setStatus('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [source]);

  return <div className={styles.preview}>
    {status === 'loading' && <div className={styles.message}><FileText /><strong>Loading Word preview…</strong></div>}
    {status === 'error' && <div className={styles.message}><FileText /><strong>Word preview could not be loaded.</strong><span>Please download {fileName} to open it.</span></div>}
    <div ref={containerRef} className={`${styles.document} ${status !== 'ready' ? styles.hidden : ''}`} />
  </div>;
}
