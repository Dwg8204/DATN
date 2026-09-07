import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Edit3, Eye, House, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../../components/common/Pagination';
import StatusBadge from '../components/StatusBadge';
import { AdminConfirmDialog, AdminToast } from '../components/AdminFeedback';
import AdminBreadcrumb from '../components/AdminBreadcrumb';
import { ADMIN_TESTS } from '../data/adminMockData';
import { deleteStoredWritingTest, getStoredWritingTests } from '../writing/data/writingTestStorage';
import { deleteStoredGrammarTest, getStoredGrammarTests } from '../grammar/data/grammarTestStorage';
import { deleteStoredReadingTest, getStoredReadingTests } from '../reading/data/readingTestStorage';
import { deleteStoredListeningTest, getStoredListeningTests } from '../listening/data/listeningTestStorage';
import { deleteStoredSpeakingTest, getStoredSpeakingTests } from '../speaking/data/speakingTestStorage';
import { filterTests, formatAdminDate, paginate } from '../utils/testManagerHelpers';
import styles from './TestManagerPage.module.css';
import './TestManagerResponsive.css';

const writingSections = ['Part 1', 'Part 2', 'Part 3', 'Part 4', 'Full Test'];
const grammarSections = ['Part 1', 'Part 2', 'Full Test'];
const components = ['Reading', 'Listening', 'Writing', 'Grammar & Vocab', 'Speaking'];
const sectionToMode = (section) => section === 'Full Test' ? 'full' : `part${section.match(/\d/)?.[0] || '1'}`;

function useMobileManager() {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return mobile;
}

export default function TestManagerPage() {
  const navigate = useNavigate();
  const isMobile = useMobileManager();
  const [storedTests, setStoredTests] = useState(() => getStoredWritingTests());
  const [storedGrammarTests, setStoredGrammarTests] = useState(() => getStoredGrammarTests());
  const [storedReadingTests, setStoredReadingTests] = useState(getStoredReadingTests);
  const [storedListeningTests, setStoredListeningTests] = useState(getStoredListeningTests);
  const [storedSpeakingTests, setStoredSpeakingTests] = useState(getStoredSpeakingTests);
  useEffect(() => { const refresh=()=>setStoredReadingTests(getStoredReadingTests());window.addEventListener('reading-tests-updated',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('reading-tests-updated',refresh);window.removeEventListener('storage',refresh)}; }, []);
  useEffect(() => { const refresh=()=>setStoredListeningTests(getStoredListeningTests());window.addEventListener('listening-tests-updated',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('listening-tests-updated',refresh);window.removeEventListener('storage',refresh)}; }, []);
  useEffect(() => { const refresh=()=>setStoredSpeakingTests(getStoredSpeakingTests());window.addEventListener('speaking-tests-updated',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('speaking-tests-updated',refresh);window.removeEventListener('storage',refresh)}; }, []);
  const [filters, setFilters] = useState({ query: '', component: components[0], section: 'Full Test', status: 'All' });
  const [page, setPage] = useState(1);
  const [confirmTest, setConfirmTest] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const refresh = () => setStoredTests(getStoredWritingTests());
    const refreshGrammar = () => setStoredGrammarTests(getStoredGrammarTests());
    window.addEventListener('writing-tests-updated', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('grammar-tests-updated', refreshGrammar);
    window.addEventListener('storage', refreshGrammar);
    return () => { window.removeEventListener('writing-tests-updated', refresh); window.removeEventListener('grammar-tests-updated', refreshGrammar); window.removeEventListener('storage', refresh); window.removeEventListener('storage', refreshGrammar); };
  }, []);

  const tests = useMemo(() => [...storedTests, ...storedGrammarTests, ...storedReadingTests, ...storedListeningTests, ...storedSpeakingTests, ...ADMIN_TESTS], [storedTests, storedGrammarTests, storedReadingTests, storedListeningTests, storedSpeakingTests]);
  const filtered = useMemo(() => filterTests(tests, filters), [tests, filters]);
  const [pageSize, setPageSize] = useState(() => isMobile ? 5 : 10);
  const pagination = paginate(filtered, page, pageSize);
  const sections = filters.component === 'Grammar & Vocab' ? grammarSections : ['Reading','Listening','Speaking'].includes(filters.component) ? ['Part 1','Part 2','Part 3','Part 4','Full Test'] : writingSections;
  const setFilter = (name, value) => { setFilters((current) => ({ ...current, [name]: value, ...(name === 'component' ? { section: 'Full Test' } : {}) })); setPage(1); };
  const addTest = () => navigate(`/admin/tests/new/${filters.component === 'Reading' ? 'reading' : filters.component === 'Listening' ? 'listening' : filters.component === 'Speaking' ? 'speaking' : filters.component === 'Grammar & Vocab' ? 'grammar' : 'writing'}?mode=${filters.section==='All'?'full':sectionToMode(filters.section)}`);
  const remove = () => {
    if (!confirmTest) return;
    if (confirmTest.component === 'Reading') { deleteStoredReadingTest(confirmTest.id); setStoredReadingTests(getStoredReadingTests()); }
    else if (confirmTest.component === 'Listening') { deleteStoredListeningTest(confirmTest.id); setStoredListeningTests(getStoredListeningTests()); }
    else if (confirmTest.component === 'Speaking') { deleteStoredSpeakingTest(confirmTest.id); setStoredSpeakingTests(getStoredSpeakingTests()); }
    else if (confirmTest.component === 'Grammar & Vocab') { deleteStoredGrammarTest(confirmTest.id); setStoredGrammarTests(getStoredGrammarTests()); }
    else { deleteStoredWritingTest(confirmTest.id); setStoredTests(getStoredWritingTests()); }
    setToast(`“${confirmTest.name}” was deleted successfully.`);
    setConfirmTest(null);
  };
  const testBase = (test) => `/admin/tests/${test.component === 'Reading' ? 'reading' : test.component === 'Listening' ? 'listening' : test.component === 'Speaking' ? 'speaking' : test.component === 'Grammar & Vocab' ? 'grammar' : 'writing'}/${test.id}`;
  const actions = (test) => test.details ? <div className="mobileTestActions">
    <button title="Preview" aria-label={`Preview ${test.name}`} onClick={() => navigate(`${testBase(test)}/preview`)}><Eye /></button>
    <button title="Edit" aria-label={`Edit ${test.name}`} onClick={() => navigate(`${testBase(test)}/edit`)}><Edit3 /></button>
    <button title="Delete" className="deleteAction" aria-label={`Delete ${test.name}`} onClick={() => setConfirmTest(test)}><Trash2 /></button>
  </div> : null;
  const from = filtered.length ? (pagination.page - 1) * pageSize + 1 : 0;
  const to = Math.min(pagination.page * pageSize, filtered.length);

  return <div className={styles.page}><AdminToast message={toast} onClose={() => setToast('')}/><AdminConfirmDialog open={Boolean(confirmTest)} title={`Delete ${confirmTest?.component || ''} test?`} message={confirmTest ? `“${confirmTest.name}” will be permanently removed from this browser. This action cannot be undone.` : ''} onCancel={() => setConfirmTest(null)} onConfirm={remove}/>
    <AdminBreadcrumb />
    <nav className={styles.components}>{components.map((component) => <button className={filters.component === component ? styles.activeComponent : ''} onClick={() => setFilter('component', component)} key={component}>{component}</button>)}</nav>
    <section className={styles.card}>
      <header>
        <nav className={styles.parts}>{sections.map((section) => <button className={filters.section === section ? styles.activePart : ''} onClick={() => setFilter('section', section)} key={section}>{section}</button>)}</nav>
        <div className={styles.tools}><span>{from}-{to} of {filtered.length}</span><label><Search /><input placeholder="Search" value={filters.query} onChange={(event) => setFilter('query', event.target.value)} /></label><button className={styles.add} onClick={addTest}><House /><span>Add new</span></button></div>
      </header>
      <div className={styles.scroll}><table><thead><tr><th><input type="checkbox" /></th><th>Name</th><th>Status</th><th>Date Added</th><th>Attempt</th><th>Questions Type</th><th /></tr></thead><tbody>{pagination.items.map((test) => <tr key={test.id}><td><input type="checkbox" /></td><td>{test.name}</td><td><StatusBadge status={test.status} /></td><td>{formatAdminDate(test.dateAdded)}</td><td>{test.attempts}</td><td><span className={styles.type}>{test.questionType}</span></td><td>{actions(test)}</td></tr>)}</tbody></table></div>
      <div className="mobileTestList">{pagination.items.map((test) => <article className="mobileTestCard" key={test.id}><header><div><small>{test.section}</small><h3>{test.name}</h3></div><StatusBadge status={test.status} /></header><dl><div><dt>Date added</dt><dd>{formatAdminDate(test.dateAdded)}</dd></div><div><dt>Attempts</dt><dd>{test.attempts}</dd></div><div><dt>Type</dt><dd>{test.questionType}</dd></div></dl>{actions(test)}</article>)}</div>
      {!pagination.items.length && <p className="mobileEmptyTests">No tests found.</p>}
      <Pagination page={page} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </section>
  </div>;
}
