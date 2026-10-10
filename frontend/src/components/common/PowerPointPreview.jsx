import { useEffect, useRef, useState } from 'react';
import { Presentation } from 'lucide-react';
import styles from './PowerPointPreview.module.css';

export default function PowerPointPreview({ source, fileName }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    Promise.all([
      fetch(source, { credentials: 'include', signal: controller.signal }).then(response => {
        if (!response.ok) throw new Error(`Unable to load PowerPoint (${response.status})`);
        return response.arrayBuffer();
      }),
      import('pptx-preview'),
    ]).then(async ([buffer, module]) => {
      if (!active || !containerRef.current) return;
      containerRef.current.replaceChildren();
      const previewer = module.init(containerRef.current, { width: 960, height: 540 });
      await previewer.preview(buffer);
      if (active) setStatus('ready');
    }).catch(error => {
      if (error.name !== 'AbortError' && active) setStatus('error');
    });
    return () => { active = false; controller.abort(); };
  }, [source]);

  return <div className={styles.preview}>
    {status !== 'ready' && <div className={styles.message}><Presentation /><strong>{status === 'loading' ? 'Loading PowerPoint preview…' : 'PowerPoint preview could not be loaded.'}</strong>{status === 'error' && <span>Please download {fileName} to open it.</span>}</div>}
    <div ref={containerRef} className={`${styles.slides} ${status !== 'ready' ? styles.hidden : ''}`} />
  </div>;
}
