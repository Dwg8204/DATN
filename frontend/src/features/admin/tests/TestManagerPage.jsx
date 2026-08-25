import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Edit3, Eye, House, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { ADMIN_TESTS } from '../data/adminMockData';
import { deleteStoredWritingTest, getStoredWritingTests } from '../writing/data/writingTestStorage';
import { filterTests, paginate } from '../utils/testManagerHelpers';
import styles from './TestManagerPage.module.css';

const sections = ['Part 1', 'Part 2', 'Part 3', 'Part 4', 'Full Writing'];
const components = ['Full', 'Reading', 'Listening', 'Writing', 'Speaking'];

export default function TestManagerPage() {
  const navigate = useNavigate();
  const [storedTests, setStoredTests] = useState(() => getStoredWritingTests());
  const [filters, setFilters] = useState({ query: '', component: 'Writing', section: 'Full Writing', status: 'All' });
  const [page, setPage] = useState(1);
  useEffect(() => { const refresh = () => setStoredTests(getStoredWritingTests()); window.addEventListener('writing-tests-updated', refresh); window.addEventListener('storage', refresh); return () => { window.removeEventListener('writing-tests-updated', refresh); window.removeEventListener('storage', refresh); }; }, []);
  const tests = useMemo(() => [...storedTests, ...ADMIN_TESTS], [storedTests]);
  const filtered = useMemo(() => filterTests(tests, filters), [tests, filters]);
  const pagination = paginate(filtered, page, 10);
  const setFilter = (name, value) => { setFilters((current) => ({ ...current, [name]: value })); setPage(1); };
  const remove = (test) => { if (!test.details || !window.confirm(`Delete “${test.name}”?`)) return; deleteStoredWritingTest(test.id); setStoredTests(getStoredWritingTests()); };

  return <div className={styles.page}><div className={styles.crumb}><b>Test Management</b><ChevronRight /><b>Admin</b></div><nav className={styles.components}>{components.map((component) => <button className={filters.component === component ? styles.activeComponent : ''} onClick={() => setFilter('component', component)} key={component}>{component}</button>)}</nav><section className={styles.card}><header><nav className={styles.parts}>{sections.map((section) => <button className={filters.section === section ? styles.activePart : ''} onClick={() => setFilter('section', section)} key={section}>{section}</button>)}</nav><div className={styles.tools}><span>{filtered.length ? `${(pagination.page - 1) * 10 + 1}-${Math.min(page * 10, filtered.length)} of ${filtered.length}` : '0 of 0'}</span><label><Search /><input placeholder="Search" value={filters.query} onChange={(event) => setFilter('query', event.target.value)} /></label><button className={styles.add} onClick={() => navigate('/admin/tests/new/writing')}><House /><span>Add new</span></button></div></header><div className={styles.scroll}><table><thead><tr><th><input type="checkbox" /></th><th>Name</th><th>Status</th><th>Date Added</th><th>Attempt</th><th>Questions Type</th><th /></tr></thead><tbody>{pagination.items.map((test) => <tr key={test.id}><td><input type="checkbox" /></td><td>{test.name}</td><td><StatusBadge status={test.status} /></td><td>{new Date(test.dateAdded).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td><td>{test.attempts}</td><td><span className={styles.type}>{test.questionType}</span></td><td>{test.details && <button aria-label={`Preview ${test.name}`} onClick={() => navigate(`/admin/tests/writing/${test.id}/preview`)}><Eye /></button>}<button aria-label={`Delete ${test.name}`} onClick={() => remove(test)}><Trash2 /></button><button aria-label={`Edit ${test.name}`} onClick={() => navigate('/admin/tests/new/writing')}><Edit3 /></button></td></tr>)}</tbody></table></div><footer><nav>{Array.from({ length: Math.min(10, pagination.totalPages) }, (_, index) => index + 1).map((number) => <button className={number === page ? styles.current : ''} key={number} onClick={() => setPage(number)}>{number}</button>)}</nav><button className={styles.next} disabled={page >= pagination.totalPages} onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}>Next <ChevronRight /></button></footer></section></div>;
}
