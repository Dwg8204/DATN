import { useEffect, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import styles from './SpreadsheetPreview.module.css';

const MAX_PREVIEW_ROWS = 500;

export default function SpreadsheetPreview({ source, fileName }) {
  const [status, setStatus] = useState('loading');
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    Promise.all([
      fetch(source, { credentials: 'include', signal: controller.signal }).then(response => {
        if (!response.ok) throw new Error(`Unable to load spreadsheet (${response.status})`);
        return response.arrayBuffer();
      }),
      import('xlsx'),
    ]).then(([buffer, XLSX]) => {
      if (!active) return;
      const workbook = XLSX.read(buffer, { type: 'array' });
      const parsedSheets = workbook.SheetNames.map(name => ({
        name,
        rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' }).slice(0, MAX_PREVIEW_ROWS),
      }));
      setSheets(parsedSheets);
      setStatus('ready');
    }).catch(error => {
      if (error.name !== 'AbortError' && active) setStatus('error');
    });
    return () => { active = false; controller.abort(); };
  }, [source]);

  if (status !== 'ready') return <div className={styles.message}><FileSpreadsheet /><strong>{status === 'loading' ? 'Loading spreadsheet preview…' : 'Spreadsheet preview could not be loaded.'}</strong>{status === 'error' && <span>Please download {fileName} to open it.</span>}</div>;
  const sheet = sheets[activeSheet];
  return <div className={styles.preview}>
    <div className={styles.tabs}>{sheets.map((item, index) => <button type="button" key={`${item.name}-${index}`} className={index === activeSheet ? styles.active : ''} onClick={() => setActiveSheet(index)}>{item.name}</button>)}</div>
    <div className={styles.tableWrap}>
      {sheet?.rows.length ? <table><tbody>{sheet.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, columnIndex) => <td key={columnIndex}>{String(cell)}</td>)}</tr>)}</tbody></table> : <div className={styles.empty}>This sheet is empty.</div>}
    </div>
    {sheet?.rows.length >= MAX_PREVIEW_ROWS && <p className={styles.limit}>Showing the first {MAX_PREVIEW_ROWS} rows.</p>}
  </div>;
}
