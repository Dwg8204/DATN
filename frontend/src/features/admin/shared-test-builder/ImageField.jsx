import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { resizeImage } from '../../../utils/resizeImage';
import { AdminToast } from '../components/AdminFeedback';
import styles from './ImageField.module.css';

export default function ImageField({ label = 'Image', value = '', onChange, uploadFile, required = false, readOnly = false, tall = false }) {
  const ui = useUiTranslation();
  const inputRef = useRef(null);
  const changeRef = useRef(onChange);
  const activeRef = useRef(false);
  useEffect(() => { changeRef.current = onChange; }, [onChange]);
  useEffect(() => { activeRef.current = true; return () => { activeRef.current = false; }; }, []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const upload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError(ui("Please choose a valid image file."));
    if (file.size > 10 * 1024 * 1024) return setError(ui("Image must be 10 MB or smaller."));
    setBusy(true);
    try {
      // Preserve the selected cover before a network upload, including while offline.
      const localImage = await resizeImage(file, 1600, 1200, { output: 'dataURL', mimeType: 'image/jpeg', quality: .82 });
      if (!activeRef.current) return;
      changeRef.current(localImage);
      if (uploadFile) {
        const result = await uploadFile(file);
        if (activeRef.current) changeRef.current(result.url);
      }
    } catch (uploadError) {
      setError(uploadError?.response?.data?.error?.message || ui("Unable to upload the image. A processed image is kept in your draft if it was read successfully."));
    } finally {
      setBusy(false);
    }
    event.target.value = '';
  };
  return <section className={`${styles.field} ${tall ? styles.tall : ''}`}>
    <AdminToast message={error} type="error" onClose={() => setError('')} />
    <div className={styles.heading}><strong>{ui(label)}{required ? ' *' : ''}</strong></div>
    {value ? <img src={value} alt={ui("{{value0}} preview", {value0:(label)})} /> : <div className={styles.empty}>{ui("No image selected")}</div>}
    {!readOnly && <div className={styles.actions}>
      <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}><ImagePlus />{busy ? ui("Uploading...") : value ? ui("Replace image") : ui("Upload image")}</button>
      {value && <button type="button" disabled={busy} className={styles.remove} onClick={() => onChange('')}><Trash2 />{ui("Remove")}</button>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={upload} />
    </div>}
  </section>;
}
