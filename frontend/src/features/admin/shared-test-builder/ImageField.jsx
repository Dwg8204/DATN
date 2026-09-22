import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { resizeImage } from '../../../utils/resizeImage';
import { AdminToast } from '../components/AdminFeedback';
import styles from './ImageField.module.css';

export default function ImageField({ label = 'Image', value = '', onChange, uploadFile, required = false, readOnly = false, tall = false }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const upload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Please choose a valid image file.');
    if (file.size > 10 * 1024 * 1024) return setError('Image must be 10 MB or smaller.');
    setBusy(true);
    try {
      if (uploadFile) {
        const result = await uploadFile(file);
        onChange(result.url);
      } else {
        onChange(await resizeImage(file, 1600, 1200, { output: 'dataURL', mimeType: 'image/jpeg', quality: .82 }));
      }
    } catch (uploadError) {
      setError(uploadError?.response?.data?.error?.message || 'Unable to process this image.');
    } finally {
      setBusy(false);
    }
    event.target.value = '';
  };
  return <section className={`${styles.field} ${tall ? styles.tall : ''}`}>
    <AdminToast message={error} type="error" onClose={() => setError('')} />
    <div className={styles.heading}><strong>{label}{required ? ' *' : ''}</strong></div>
    {value ? <img src={value} alt={`${label} preview`} /> : <div className={styles.empty}>No image selected</div>}
    {!readOnly && <div className={styles.actions}>
      <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}><ImagePlus />{busy ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}</button>
      {value && <button type="button" disabled={busy} className={styles.remove} onClick={() => onChange('')}><Trash2 />Remove</button>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={upload} />
    </div>}
  </section>;
}
