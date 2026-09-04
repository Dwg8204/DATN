import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminConfirmDialog, AdminValidationToast } from '../components/AdminFeedback';
import PartSummaryCard from '../writing/components/PartSummaryCard';
import { resizeImage } from '../../../utils/resizeImage';
import { useReadingBuilder } from './context/ReadingBuilderContext';
import { READING_PARTS } from './data/readingTestModel';
import { saveStoredReadingTest } from './data/readingTestStorage';
import { validateReadingTest } from './validation/readingValidation';
import styles from '../writing/WritingTestDetailsPage.module.css';
import { Field } from './components/EditorFields';
export default function ReadingTestDetailsPage() {
  const {
    test,
    setTest,
    basePath
  } = useReadingBuilder();
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const [errors, setErrors] = useState([]);
  const [confirm, setConfirm] = useState(false);
  const detail = (field, value) => setTest(current => ({
    ...current,
    details: {
      ...current.details,
      [field]: value
    }
  }));
  const requestSave = () => {
    const next = validateReadingTest(test);
    setErrors(next);
    if (!next.length) setConfirm(true);
  };
  const persist = () => {
    try {
      const saved = saveStoredReadingTest(test);
      navigate(`/admin/tests/reading/${saved.id}/preview`, {
        state: {
          toast: test.id ? 'Reading test updated successfully.' : 'Reading test created successfully.'
        }
      });
    } catch {
      setErrors(['Unable to save. Browser storage may be full.']);
    } finally {
      setConfirm(false);
    }
  };
  const upload = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors(['Choose an image file.']);
      return;
    }
    try {
      detail('pictureUrl', await resizeImage(file, 1400, 900, {
        output: 'dataURL',
        mimeType: 'image/jpeg',
        quality: .82
      }));
    } catch {
      setErrors(['Unable to process image.']);
    }
  };
  const parts = READING_PARTS.filter(p => test.mode === 'full' || test.mode === `part${p.number}`);
  return (
    <div className={styles.page}>
      <AdminValidationToast errors={errors} onClose={() => setErrors([])} />
      <AdminConfirmDialog
        open={confirm}
        title={test.id ? 'Save changes to this test?' : 'Create Reading test?'}
        message="Confirm to save this Reading test and make it available in the test list."
        confirmLabel="Save test"
        onCancel={() => setConfirm(false)}
        onConfirm={persist}
      />
      <div className={styles.crumb}>
        Test Management › Admin › {test.details.title || 'New Reading test'}
      </div>
      <section className={styles.information}>
        <h2>INFORMATION TEST</h2>
        <div className={styles.infoGrid}>
          <div className={styles.fields}>
            <Field stacked label="Title" value={test.details.title} onChange={value => detail('title', value)} />
            <Field stacked label="Source" value={test.details.source} onChange={value => detail('source', value)} />
            <label>
              <b>Picture:</b>
              <button type="button" onClick={() => fileInput.current?.click()}>
                <ImagePlus /> Upload image
              </button>
              <input ref={fileInput} className={styles.fileInput} type="file" accept="image/*" onChange={upload} />
              {test.details.pictureUrl && <small>Image uploaded.</small>}
            </label>
          </div>
          <aside>
            <b>Preview</b>
            <div>
              <header><span>{test.mode === 'full' ? 'Full test' : test.mode.replace('part', 'Part ')}</span></header>
              {test.details.pictureUrl
                ? <img src={test.details.pictureUrl} alt="Cover" />
                : <strong>AptiMate<br /><em>Reading</em></strong>}
              <button onClick={requestSave}>Preview</button>
            </div>
          </aside>
        </div>
      </section>
      <section className={styles.content}>
        <h2>CONTENT TEST</h2>
        <div>
          {parts.map(part => (
            <PartSummaryCard key={part.number} part={part} onEdit={() => navigate(`${basePath}/part/${part.number}`)} />
          ))}
        </div>
        <button className={styles.saveAll} onClick={requestSave}>
          {test.id ? 'Update test & preview' : 'Save test & preview'}
        </button>
      </section>
    </div>
  );
}
