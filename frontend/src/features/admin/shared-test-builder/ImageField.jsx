import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { resizeImage } from '../../../utils/resizeImage';
import { AdminToast } from '../components/AdminFeedback';
import styles from './ImageField.module.css';

export default function ImageField({ label = 'Image', value = '', onChange, required = false, readOnly = false, tall = false }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const upload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Please choose a valid image file.');
    if (file.size > 10 * 1024 * 1024) return setError('Image must be 10 MB or smaller.');
    try { onChange(await resizeImage(file, 1600, 1200, { output: 'dataURL', mimeType: 'image/jpeg', quality: .82 })); }
    catch { setError('Unable to process this image.'); }
    event.target.value = '';
  };
  return <section className={`${styles.field} ${tall ? styles.tall : ''}`}>
    <AdminToast message={error} type="error" onClose={() => setError('')} />
    <div className={styles.heading}><strong>{label}{required ? ' *' : ''}</strong></div>
    {value ? <img src={value} alt={`${label} preview`} /> : <div className={styles.empty}>No image selected</div>}
    {!readOnly && <div className={styles.actions}>
      <button type="button" onClick={() => inputRef.current?.click()}><ImagePlus />{value ? 'Replace image' : 'Upload image'}</button>
      {value && <button type="button" className={styles.remove} onClick={() => onChange('')}><Trash2 />Remove</button>}
      <input ref={inputRef} type="file" accept="image/*" onChange={upload} />
    </div>}
  </section>;
}
