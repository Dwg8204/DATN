import { useEffect, useRef, useState } from 'react';
import { Bold, IndentDecrease, IndentIncrease, Italic, List, ListOrdered, Redo2, RemoveFormatting, Underline, Undo2 } from 'lucide-react';
import { AdminToast } from '../components/AdminFeedback';
import { countRichTextWords, sanitizeRichText, toRichTextHtml } from '../../../components/common/richText';
import styles from './RichTextEditor.module.css';

export default function RichTextEditor({ label, value, onChange, maxWords = 500, minHeight = 150 }) {
  const editorRef = useRef(null);
  const timerRef = useRef(null);
  const [notice, setNotice] = useState('');
  const html = toRichTextHtml(value);

  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current && editorRef.current.innerHTML !== html) editorRef.current.innerHTML = html;
  }, [html]);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const sync = () => {
    clearTimeout(timerRef.current);
    const next = sanitizeRichText(editorRef.current?.innerHTML || '');
    const words = countRichTextWords(next);
    if (words > maxWords) {
      setNotice(`Maximum ${maxWords} words. Shorten the text before adding more.`);
      if (editorRef.current) editorRef.current.innerHTML = html;
      return;
    }
    setNotice('');
    onChange(next);
  };
  const queueSync = () => { clearTimeout(timerRef.current); timerRef.current = setTimeout(sync, 120); };
  const command = name => { editorRef.current?.focus(); document.execCommand(name); sync(); };
  const tools = [
    ['bold', 'Bold', Bold], ['italic', 'Italic', Italic], ['underline', 'Underline', Underline],
    ['insertUnorderedList', 'Bullet list', List], ['insertOrderedList', 'Numbered list', ListOrdered],
    ['outdent', 'Decrease indent', IndentDecrease], ['indent', 'Increase indent', IndentIncrease],
    ['undo', 'Undo', Undo2], ['redo', 'Redo', Redo2], ['removeFormat', 'Clear formatting', RemoveFormatting],
  ];
  return <label className={styles.field}>
    <AdminToast message={notice} type="error" onClose={() => setNotice('')}/>
    <span>{label}</span>
    <div className={styles.frame}>
      <div className={styles.toolbar} role="toolbar" aria-label={`${label} formatting`}>{tools.map(([commandName, title, Icon]) => <button type="button" title={title} aria-label={title} key={commandName} onMouseDown={event => event.preventDefault()} onClick={() => command(commandName)}><Icon/></button>)}</div>
      <div ref={editorRef} className={styles.editor} style={{ minHeight }} contentEditable suppressContentEditableWarning onInput={queueSync} onBlur={sync} data-placeholder={`Enter ${label.toLowerCase()}…`}/>
    </div>
    <small>{countRichTextWords(value)} / {maxWords} words</small>
  </label>;
}
