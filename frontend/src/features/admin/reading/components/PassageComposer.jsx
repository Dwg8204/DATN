import { useUiTranslation } from "../../../../i18n/useUiTranslation.jsx";
import { useEffect, useRef, useState } from 'react';
import { Bold, IndentDecrease, IndentIncrease, Italic, Redo2, RemoveFormatting, Underline, Undo2 } from 'lucide-react';
import { getPassageHtml, htmlToLegacyPassage, sanitizePassageHtml } from '../utils/richPassage';
import { AdminConfirmDialog } from '../../components/AdminFeedback';
import styles from './PassageComposer.module.css';

export default function PassageComposer({ value, onChange, onGapCreated, onGapRemoved }) {
  const ui = useUiTranslation();
  const editorRef = useRef(null);
  const [pendingGap, setPendingGap] = useState(null);
  const latestHtml = getPassageHtml(value);
  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current && editorRef.current.innerHTML !== latestHtml) editorRef.current.innerHTML = latestHtml;
  }, [latestHtml]);


  const sync = () => {
    const passageHtml = sanitizePassageHtml(editorRef.current.innerHTML);
    onChange({ ...value, passageHtml, passage: htmlToLegacyPassage(passageHtml), passageVersion: 2 });
  };
  const command = (name, argument = null) => { editorRef.current.focus(); document.execCommand(name, false, argument); sync(); };
  const insertGap = () => {
    const current = htmlToLegacyPassage(editorRef.current.innerHTML);
    const missing = [1,2,3,4,5].find(number => !current.includes(`[${number}]`));
    if (!missing) return;
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || '';
    if (!selection?.rangeCount || !editorRef.current.contains(selection.anchorNode)) editorRef.current.focus();
    document.execCommand('insertHTML', false, `<span data-gap="${missing}" contenteditable="false">Gap ${missing}</span>`);
    sync();
    onGapCreated?.(missing, selectedText);
  };
  const removeGap = () => {
    editorRef.current?.querySelector(`[data-gap="${pendingGap}"]`)?.remove();
    sync();
    onGapRemoved?.(pendingGap);
    setPendingGap(null);
  };
  return <section className={styles.composer}>
    <AdminConfirmDialog open={Boolean(pendingGap)} title={ui("Remove Gap {{value0}}?", {value0:(pendingGap)})} message="The gap marker and its answer options will be cleared. You can insert this gap again later." confirmLabel={ui("Remove gap")} onCancel={() => setPendingGap(null)} onConfirm={removeGap}/>
    <header><div><strong>{ui("Passage")}</strong><span>{ui("Select a word or place the cursor, then insert a gap.")}</span></div></header>
    <div className={styles.toolbar} role="toolbar" aria-label={ui("Passage formatting")}>
      <button type="button" title={ui("Bold")} onClick={() => command('bold')}><Bold/></button><button type="button" title={ui("Italic")} onClick={() => command('italic')}><Italic/></button><button type="button" title={ui("Underline")} onClick={() => command('underline')}><Underline/></button>
      <button type="button" title={ui("Decrease indent")} onClick={() => command('outdent')}><IndentDecrease/></button><button type="button" title={ui("Increase indent")} onClick={() => command('indent')}><IndentIncrease/></button>
      <button type="button" title={ui("Undo")} onClick={() => command('undo')}><Undo2/></button><button type="button" title={ui("Redo")} onClick={() => command('redo')}><Redo2/></button><button type="button" title={ui("Clear formatting")} onClick={() => command('removeFormat')}><RemoveFormatting/></button>
      <button type="button" className={styles.gapButton} onClick={insertGap}>{ui("Insert next gap")}</button>
    </div>
    <div ref={editorRef} className={styles.editor} contentEditable suppressContentEditableWarning onInput={sync} onBlur={sync} onClick={event => { const gap = event.target.closest?.('[data-gap]'); if (gap) setPendingGap(Number(gap.dataset.gap)); }} data-placeholder="Write or paste the complete passage here…" />
    <small>{ui("Use Enter for a new paragraph and Shift + Enter for a line break. Formatting is cleaned when pasted. Select a gap marker to remove it.")}</small>
  </section>;
}
