import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminConfirmDialog } from '../components/AdminFeedback';
import AdminBreadcrumb from '../components/AdminBreadcrumb';
import ImageField from '../shared-test-builder/ImageField';
import PartSummaryCard from '../writing/components/PartSummaryCard';
import { useGrammarTestBuilder } from './context/GrammarTestBuilderContext';
import { saveStoredGrammarTest } from './data/grammarTestStorage';
import { validateGrammarTest } from './data/grammarTestValidation';
import styles from '../writing/WritingTestDetailsPage.module.css';

const PARTS = [
  { number: 1, title: 'Grammar', summary: '25 multiple-choice questions.' },
  { number: 2, title: 'Vocabulary', summary: '5 sets of word-matching questions.' },
];

export default function GrammarTestDetailsPage() {
  const navigate = useNavigate();
  const { test, updateDetails, basePath } = useGrammarTestBuilder();
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(false);
  const visible = test.mode === 'full' ? PARTS : PARTS.filter(part => `part${part.number}` === test.mode);
  const requestSave = () => {
    const next = validateGrammarTest(test);
    setErrors(next);
    if (Object.keys(next).length) return setMessage('Complete the required information and content in each selected Part before saving.');
    setConfirm(true);
  };
  const persist = () => {
    setConfirm(false);
    const saved = saveStoredGrammarTest(test);
    navigate(`/admin/tests/grammar/${saved.id}/preview`, { state: { toast: test.id ? 'Grammar & Vocabulary test updated successfully.' : 'Grammar & Vocabulary test created successfully.' } });
  };

  return <div className={styles.page}>
    <AdminConfirmDialog open={confirm} title={test.id ? 'Save changes to this test?' : 'Create this test?'} message={test.id ? 'Your changes will replace the saved Grammar & Vocabulary test.' : 'The test will be saved and displayed in the Grammar & Vocabulary test list.'} confirmLabel={test.id ? 'Save changes' : 'Create test'} onCancel={() => setConfirm(false)} onConfirm={persist} />
    <AdminBreadcrumb current={test.details.title || 'New test'} />
    <section className={styles.information}>
      <h2>INFORMATION TEST</h2>
      <div className={styles.infoGrid}>
        <div className={styles.fields}>
          <label><b>Title:</b><input value={test.details.title} onChange={event => updateDetails('title', event.target.value)} />{errors.title && <small>{errors.title}</small>}</label>
          <ImageField label="Test cover" value={test.details.pictureUrl} onChange={value => updateDetails('pictureUrl', value)} />
          <button className={styles.saveInfo} onClick={() => setMessage('Test information saved in the current draft.')}>Save</button>
          {message && <p className={styles.message}>{message}</p>}
        </div>
        <aside><b>Preview</b><div><header><span>{test.mode === 'full' ? 'Full test' : test.mode.replace('part', 'Part ')}</span><small>Not Started</small></header>{test.details.pictureUrl ? <img src={test.details.pictureUrl} alt="Test preview" /> : <strong>AptiMate<br /><em>Grammar</em></strong>}<button onClick={requestSave}>Preview</button></div></aside>
      </div>
    </section>
    <section className={styles.content}><h2>CONTENT TEST</h2><div>{visible.map(part => <PartSummaryCard key={part.number} part={part} onEdit={() => navigate(`${basePath}/part/${part.number}`)} />)}</div><button className={styles.saveAll} onClick={requestSave}>{test.id ? 'Update test & preview' : 'Save test & preview'}</button></section>
  </div>;
}
