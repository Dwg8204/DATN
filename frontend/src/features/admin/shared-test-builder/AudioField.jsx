import { useRef, useState } from 'react';
import { Headphones, Upload } from 'lucide-react';
import { AdminToast } from '../components/AdminFeedback';
import styles from './AudioField.module.css';

const readDataUrl = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

export default function AudioField({ label = 'Audio', value = '', onChange, readOnly = false, maxSizeMb = 15 }) {
  const input = useRef(null);
  const [error, setError] = useState('');
  const upload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) return setError('Please choose a valid audio file.');
    if (file.size > maxSizeMb * 1024 * 1024) return setError(`Audio must be ${maxSizeMb} MB or smaller.`);
    try { onChange(await readDataUrl(file)); } catch { setError('Unable to read this audio file.'); }
    event.target.value = '';
  };
  return <section className={styles.field}>
    <AdminToast message={error} type="error" onClose={() => setError('')} />
    <div className={styles.heading}><Headphones /><strong>{label}</strong></div>
    {!readOnly && <div className={styles.controls}>
      <input aria-label={`${label} URL`} placeholder="Paste an MP3 or audio URL" value={value.startsWith('data:') ? '' : value} onChange={event => onChange(event.target.value)} />
      <span>or</span>
      <button type="button" onClick={() => input.current?.click()}><Upload /> Upload audio</button>
      <input ref={input} className={styles.file} type="file" accept="audio/*" onChange={upload} />
    </div>}
    {value && <div className={styles.preview}><audio controls preload="metadata" src={value} />{!readOnly && <button type="button" onClick={() => onChange('')}>Remove</button>}</div>}
    <small>{value ? value.startsWith('data:') ? 'Uploaded audio is ready.' : 'Audio URL is ready.' : `MP3 is recommended. Maximum upload size: ${maxSizeMb} MB.`}</small>
  </section>;
}
