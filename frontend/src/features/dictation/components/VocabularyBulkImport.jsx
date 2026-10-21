import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X } from 'lucide-react';
import { studyApi } from '../services/studyApi';
import { BulkWordFileError, downloadBulkWordTemplate, parseBulkWordFile } from '../utils/bulkWordFile';
import { normalizeApiError } from '../../../services/apiError';
import styles from './VocabularyBulkImport.module.css';

export default function VocabularyBulkImport({ onClose, mutate, onComplete }) {
  const { t } = useTranslation();
  const requestId = useRef(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const loading = Boolean(busy);
  const describeRowError = item => {
    const maximum = /^Maximum (\d+) characters\.$/.exec(item.message);
    if (maximum) return t('dictation.bulkFieldErrors.maximum', { count: Number(maximum[1]) });
    const keys = {
      'Invalid or repeated row number.': 'rowNumber',
      'Unexpected column.': 'unexpected',
      'This cell must contain text.': 'text',
      'This cell is required.': 'required',
      'Enter an English word or phrase.': 'englishWord',
      'Unsupported word type.': 'wordType',
      'Enter a Vietnamese meaning without other scripts.': 'vietnamese',
      'Enter an English example sentence.': 'englishExample',
    };
    return keys[item.message] ? t(`dictation.bulkFieldErrors.${keys[item.message]}`) : item.message;
  };

  const chooseFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFileName(file.name); setRows(null); setPreview(null); setResult(null); setError('');
    requestId.current = crypto.randomUUID();
    setBusy('reading');
    let phase = 'reading';
    try {
      const parsed = await parseBulkWordFile(file);
      setRows(parsed);
      phase = 'preview';
      setBusy('preview');
      setPreview(await studyApi.previewBulk(parsed));
    } catch (cause) {
      setError(cause instanceof BulkWordFileError ? t(`dictation.bulkErrors.${cause.code}`)
        : phase === 'reading' ? t('dictation.bulkErrors.read') : normalizeApiError(cause).message);
    } finally { setBusy(''); }
  };

  const retryPreview = async () => {
    if (!rows || loading) return;
    setError(''); setBusy('preview');
    try { setPreview(await studyApi.previewBulk(rows)); }
    catch (cause) { setError(normalizeApiError(cause).message); }
    finally { setBusy(''); }
  };

  const confirm = async () => {
    if (!rows || !preview || preview.counts.error || loading || result) return;
    setError(''); setBusy('saving');
    try {
      const saved = await mutate(() => studyApi.importBulk({ rows, clientRequestId: requestId.current }));
      if (!saved) throw new Error('Session changed');
      setResult(saved);
      onComplete(saved);
    } catch (cause) {
      if (cause?.response?.status === 400) {
        try { setPreview(await studyApi.previewBulk(rows)); } catch { /* Keep the previous preview. */ }
        setError(t('dictation.bulkErrors.changed'));
      } else setError(normalizeApiError(cause).message);
    } finally { setBusy(''); }
  };

  return <div className={styles.backdrop}>
    <section className={styles.modal} role="dialog" aria-modal="true" aria-label={t('dictation.bulkTitle')}>
      <header className={styles.header}>
        <div><span>{t('dictation.bulkEyebrow')}</span><h2>{t('dictation.bulkTitle')}</h2></div>
        <button type="button" onClick={onClose} disabled={loading} aria-label={t('dictation.cancel')}><X size={20} /></button>
      </header>
      <p>{t('dictation.bulkRules')}</p>
      <div className={styles.templates}>
        <button type="button" onClick={() => downloadBulkWordTemplate('xlsx')}>{t('dictation.bulkTemplateXlsx')}</button>
        <button type="button" onClick={() => downloadBulkWordTemplate('csv')}>{t('dictation.bulkTemplateCsv')}</button>
      </div>
      <p className={styles.columns}><code>word, pronunciation, word_type, vietnamese_meaning, example_sentence, topic</code></p>
      <p className={styles.hint}>{t('dictation.bulkTypes')}</p>
      <label className={styles.filePicker}><Upload size={19} /> {fileName || t('dictation.bulkChoose')}
        <input type="file" accept=".xlsx,.csv" onChange={chooseFile} disabled={loading} />
      </label>
      {loading && <p role="status" className={styles.busy}>{t(busy === 'saving' ? 'dictation.bulkSaving' : 'dictation.bulkChecking')}</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {rows && !preview && <p role="status" className={styles.hint}>{t('dictation.bulkParsed', { count: rows.length })}</p>}
      {rows && !preview && !loading && <button type="button" className={styles.retry} onClick={retryPreview}>{t('dictation.bulkRetry')}</button>}
      {preview && <>
        <div className={styles.counts} aria-label={t('dictation.bulkPreview')}>
          <span>{t('dictation.bulkReady', { count: preview.counts.ready })}</span>
          <span>{t('dictation.bulkDuplicate', { count: preview.counts.duplicate })}</span>
          <span className={preview.counts.error ? styles.error : ''}>{t('dictation.bulkInvalid', { count: preview.counts.error })}</span>
        </div>
        {preview.newFolders.length > 0 && <p>{t('dictation.bulkNewFolders', { names: preview.newFolders.join(', ') })}</p>}
        <div className={styles.tableScroll}><table>
          <thead><tr><th>{t('dictation.bulkRow')}</th><th>{t('dictation.bulkWord')}</th><th>{t('dictation.bulkFolder')}</th><th>{t('dictation.bulkStatus')}</th></tr></thead>
          <tbody>{preview.rows.map(row => <tr key={row.rowNumber}>
            <td>{row.rowNumber}</td><td>{row.word || '—'}</td><td>{row.topic || '—'}{row.folder === 'new' ? ` (${t('dictation.bulkNew')})` : ''}</td>
            <td><strong className={row.status === 'error' ? styles.error : ''}>{t(`dictation.bulkStatuses.${row.status}`)}</strong>
              {row.errors.map((item, index) => <small key={`${item.field}-${index}`}>{item.field}: {describeRowError(item)}</small>)}</td>
          </tr>)}</tbody>
        </table></div>
      </>}
      {result && <p role="status" className={styles.success}>{t('dictation.bulkDone', { created: result.created, duplicate: result.duplicate, folders: result.foldersCreated.length })}</p>}
      <footer className={styles.actions}>
        <button type="button" onClick={onClose} disabled={loading}>{t(result ? 'dictation.bulkClose' : 'dictation.cancel')}</button>
        {!result && <button type="button" className={styles.confirm} onClick={confirm} disabled={loading || !preview || preview.counts.error > 0}>{t('dictation.bulkConfirm')}</button>}
      </footer>
    </section>
  </div>;
}
