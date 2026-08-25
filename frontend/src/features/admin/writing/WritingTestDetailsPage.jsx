import { useRef, useState } from 'react';
import { ChevronRight, ImagePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWritingTestBuilder } from './context/WritingTestBuilderContext';
import { WRITING_PART_META } from './data/writingBuilderInitialState';
import { saveStoredWritingTest } from './data/writingTestStorage';
import PartSummaryCard from './components/PartSummaryCard';
import { hasValidationErrors, validateWritingDetails } from './validation/writingTestValidation';
import styles from './WritingTestDetailsPage.module.css';

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read this image.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('The selected file is not a valid image.'));
      image.onload = () => {
        const scale = Math.min(1, 1400 / image.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function WritingTestDetailsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { test, updateDetails } = useWritingTestBuilder();
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  const uploadPicture = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErrors((current) => ({ ...current, pictureUrl: 'Please choose an image file.' })); return; }
    try {
      updateDetails('pictureUrl', await resizeImage(file));
      setErrors((current) => ({ ...current, pictureUrl: undefined }));
      setMessage('Picture uploaded successfully.');
    } catch (error) { setErrors((current) => ({ ...current, pictureUrl: error.message })); }
  };

  const validateDetails = () => { const next = validateWritingDetails(test.details); setErrors(next); return !hasValidationErrors(next); };
  const saveInformation = () => { if (validateDetails()) setMessage('Test information saved in the current draft.'); };
  const saveTest = () => {
    if (!validateDetails()) return;
    try { const saved = saveStoredWritingTest(test); navigate(`/admin/tests/writing/${saved.id}/preview`); }
    catch { setMessage('The image is too large to save in this browser. Please upload a smaller image.'); }
  };

  return <div className={styles.page}><div className={styles.crumb}><b>Test Management</b><ChevronRight /><b>Admin</b><ChevronRight /><span>{test.details.title || 'New test'}</span></div><section className={styles.information}><h2>INFORMATION TEST</h2><div className={styles.infoGrid}><div className={styles.fields}><label><b>Title:</b><input value={test.details.title} onChange={(event) => updateDetails('title', event.target.value)} />{errors.title && <small>{errors.title}</small>}</label><label><b>Source:</b><input value={test.details.source} onChange={(event) => updateDetails('source', event.target.value)} />{errors.source && <small>{errors.source}</small>}</label><label><b>Picture:</b><button type="button" onClick={() => fileInputRef.current?.click()}><ImagePlus />Upload image</button><input ref={fileInputRef} style={{ display: 'none' }} type="file" accept="image/*" onChange={uploadPicture} />{errors.pictureUrl && <small>{errors.pictureUrl}</small>}</label><button className={styles.saveInfo} onClick={saveInformation}>Save</button>{message && <small>{message}</small>}</div><aside><b>Preview</b><div><header><span>Test 1</span><small>Not Started</small></header>{test.details.pictureUrl ? <img src={test.details.pictureUrl} alt="Test preview" /> : <strong>BRITISH<br />COUNCIL&nbsp;&nbsp; <em>AptiMate</em></strong>}<button onClick={saveTest}>Do the test</button></div></aside></div></section><section className={styles.content}><h2>CONTENT TEST</h2><div>{WRITING_PART_META.map((part) => <PartSummaryCard key={part.number} part={part} onEdit={() => navigate(`/admin/tests/new/writing/part/${part.number}`)} />)}</div><button className={styles.saveAll} onClick={saveTest}>Save test &amp; preview</button></section></div>;
}
