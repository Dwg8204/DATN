import { useRef, useState } from 'react';
import { Headphones, Upload } from 'lucide-react';
import { AdminToast } from '../components/AdminFeedback';
import styles from './AudioField.module.css';

import { listeningTestsApi } from '../listening/services/listeningTestsApi';

export default function AudioField({ label = 'Audio', value = '', onChange, readOnly = false, maxSizeMb = 15 }) {
  const input = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const upload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3') && !file.name.endsWith('.wav')) return setError('Please choose a valid audio file.');
    if (file.size > maxSizeMb * 1024 * 1024) return setError(`Audio must be ${maxSizeMb} MB or smaller.`);
    
    try {
      setLoading(true);
      setError('');
      const data = await listeningTestsApi.uploadAudio(file);
      onChange(data.url);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Unable to upload this audio file.');
    } finally {
      setLoading(false);
      if (input.current) input.current.value = '';
    }
  };
  return <section className={styles.field}>
    <AdminToast message={error} type="error" onClose={() => setError('')} />
    <div className={styles.heading}><Headphones /><strong>{label}</strong></div>
    {!readOnly && <div className={styles.controls}>
      <input aria-label={`${label} URL`} placeholder="Paste an MP3 or audio URL" value={value.startsWith('data:') ? '' : value} onChange={event => onChange(event.target.value)} />
      <span>or</span>
      <button type="button" onClick={() => input.current?.click()} disabled={loading}><Upload /> {loading ? 'Uploading...' : 'Upload audio'}</button>
      <input ref={input} className={styles.file} type="file" accept="audio/*" onChange={upload} />
    </div>}
    {value && <div className={styles.preview}><audio controls preload="metadata" src={value} />{!readOnly && <button type="button" onClick={() => onChange('')}>Remove</button>}</div>}
    <small>{value ? value.startsWith('data:') ? 'Uploaded audio is ready.' : 'Audio URL is ready.' : `MP3 is recommended. Maximum upload size: ${maxSizeMb} MB.`}</small>
  </section>;
}
