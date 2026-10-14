import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { useEffect, useRef, useState } from 'react';
import { Headphones, Upload } from 'lucide-react';
import { AdminToast } from '../components/AdminFeedback';
import styles from './AudioField.module.css';

import { listeningTestsApi } from '../listening/services/listeningTestsApi';
import { readFileAsDataUrl } from './builderMedia';

export default function AudioField({ label = 'Audio', value = '', onChange, readOnly = false, maxSizeMb = 15 }) {
  const ui = useUiTranslation();
  const input = useRef(null);
  const changeRef = useRef(onChange);
  const activeRef = useRef(false);
  const uploadRevision = useRef(0);
  const changeValue = value => {
    uploadRevision.current += 1;
    onChange(value);
  };
  useEffect(() => { changeRef.current = onChange; }, [onChange]);
  useEffect(() => { activeRef.current = true; return () => { activeRef.current = false; }; }, []);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const upload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3') && !file.name.endsWith('.wav')) return setError(ui("Please choose a valid audio file."));
    if (file.size > maxSizeMb * 1024 * 1024) return setError(ui("Audio must be {{value0}} MB or smaller.", {value0:(maxSizeMb)}));
    const revision = ++uploadRevision.current;

    try {
      setLoading(true);
      setError('');
      // A data URL survives reload; a blob URL would lose the selected audio file.
      const localAudio = await readFileAsDataUrl(file);
      if (!activeRef.current || revision !== uploadRevision.current) return;
      changeRef.current(localAudio);
      const data = await listeningTestsApi.uploadAudio(file);
      if (activeRef.current && revision === uploadRevision.current) changeRef.current(data.url);
    } catch (e) {
      if (activeRef.current && revision === uploadRevision.current) setError(e?.response?.data?.error?.message || ui("Unable to upload audio. The selected file is kept in your local draft and will be uploaded when you save to the server."));
    } finally {
      setLoading(false);
      if (input.current) input.current.value = '';
    }
  };
  return <section className={styles.field}>
    <AdminToast message={error} type="error" onClose={() => setError('')} />
    <div className={styles.heading}><Headphones /><strong>{ui(label)}</strong></div>
    {!readOnly && <div className={styles.controls}>
      <input aria-label={ui("{{value0}} URL", {value0:(label)})} placeholder={ui("Paste an MP3 or audio URL")} value={value.startsWith('data:') ? '' : value} onChange={event => changeValue(event.target.value)} />
      <span>{ui("or")}</span>
      <button type="button" onClick={() => input.current?.click()} disabled={loading}><Upload /> {loading ? ui("Uploading...") : ui("Upload audio")}</button>
      <input ref={input} className={styles.file} type="file" accept="audio/*" onChange={upload} />
    </div>}
    {value && <div className={styles.preview}><audio controls preload="metadata" src={value} />{!readOnly && <button type="button" onClick={() => changeValue('')}>{ui("Remove")}</button>}</div>}
    <small>{value ? value.startsWith('data:') ? ui("Audio is stored locally. Save to the server to finish uploading.") : ui("Audio URL is ready.") : ui("MP3 is recommended. Maximum upload size: {{value0}} MB.", {value0:(maxSizeMb)})}</small>
  </section>;
}
