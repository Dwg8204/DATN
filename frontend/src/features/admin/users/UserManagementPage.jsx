import { useMemo, useState } from 'react';
import { Edit3, LockKeyhole, Plus, Search, Trash2 } from 'lucide-react';
import { AdminConfirmDialog, AdminToast } from '../components/AdminFeedback';
import { formatAdminDate, paginate } from '../utils/testManagerHelpers';
import UserEditorDialog from './components/UserEditorDialog';
import { deleteManagedUser, getManagedUsers, saveManagedUser } from './data/userManagementStorage';
import { validateManagedUser } from './validation/userValidation';
import styles from './UserManagementPage.module.css';

const roles = [
  { id: 'admin', label: 'Admin' },
  { id: 'user', label: 'User' },
  { id: 'teacher', label: 'Teacher' },
];
const emptyUser = (role) => ({ id: '', role, name: '', email: '', status: 'Active', specialization: '' });

function Avatar({ name }) {
  return <span className={styles.avatar}>{name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState(getManagedUsers);
  const [role, setRole] = useState('admin');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState(null);
  const [editorError, setEditorError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState('');
  const filtered = useMemo(() => users.filter((user) => user.role === role && `${user.name} ${user.email}`.toLowerCase().includes(query.trim().toLowerCase())), [users, role, query]);
  const pagination = paginate(filtered, page, 5);
  const changeRole = (nextRole) => { setRole(nextRole); setQuery(''); setPage(1); };
  const save = () => {
    const original = editor.id ? users.find((user) => user.id === editor.id) : null;
    const allowedPromotion = !original || original.role === editor.role || (original.role === 'user' && editor.role === 'teacher') || (original.role === 'teacher' && editor.role === 'admin');
    if (!allowedPromotion) return setEditorError('This role change is not permitted.');
    const error = validateManagedUser(editor, users);
    if (error) return setEditorError(error);
    const existed = Boolean(editor.id);
    saveManagedUser({ ...editor, name: editor.name.trim(), email: editor.email.trim() });
    setUsers(getManagedUsers()); setEditor(null); setEditorError('');
    setToast(existed ? 'Account updated successfully.' : 'Account created successfully.');
  };
  const remove = () => {
    if (deleteManagedUser(deleteTarget.id)) { setUsers(getManagedUsers()); setToast('Account deleted successfully.'); }
    setDeleteTarget(null);
  };
  const actions = (user) => {
    const locked = user.role === 'admin';
    return <div className={styles.actions}>
      <button disabled={locked} title={locked ? 'Admin accounts cannot be edited' : 'Edit'} aria-label={`Edit ${user.name}`} onClick={() => { setEditor({ ...user }); setEditorError(''); }}>{locked ? <LockKeyhole /> : <Edit3 />}</button>
      <button disabled={locked} title={locked ? 'Admin accounts cannot be deleted' : 'Delete'} aria-label={`Delete ${user.name}`} onClick={() => setDeleteTarget(user)}><Trash2 /></button>
    </div>;
  };
  return <div className={styles.page}>
    <AdminToast message={toast} onClose={() => setToast('')} />
    <AdminConfirmDialog open={Boolean(deleteTarget)} title="Delete this account?" message={deleteTarget ? `“${deleteTarget.name}” will permanently lose access to AptiMate. This action cannot be undone.` : ''} onCancel={() => setDeleteTarget(null)} onConfirm={remove} />
    <UserEditorDialog user={editor} error={editorError} onChange={(field, value) => { setEditor((current) => ({ ...current, [field]: value })); setEditorError(''); }} onCancel={() => { setEditor(null); setEditorError(''); }} onSave={save} />
    <header className={styles.toolbar}>
      <nav className={styles.components} aria-label="Account type">{roles.map((item) => <button className={role === item.id ? styles.activeComponent : ''} onClick={() => changeRole(item.id)} key={item.id}>{item.label}</button>)}</nav>
      <div className={styles.tools}><label><Search /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search people" /></label><button className={styles.add} onClick={() => { setEditor(emptyUser(role)); setEditorError(''); }}><Plus />Add {role}</button></div>
    </header>
    <section className={styles.panel}>
      <header><div><h2>Team members</h2><span>{filtered.length} {filtered.length === 1 ? 'account' : 'accounts'}</span></div></header>
      <div className={styles.tableWrap}><table><thead><tr><th>Name</th>{role === 'teacher' && <th>Specialization</th>}<th className={styles.alignRight}>Status</th><th className={styles.alignRight}>Date added</th><th className={styles.actionColumn}>Actions</th></tr></thead><tbody>{pagination.items.map((user) => <tr key={user.id}><td><div className={styles.person}><Avatar name={user.name} /><span><b>{user.name}</b><small>{user.email}</small></span></div></td>{role === 'teacher' && <td>{user.specialization}</td>}<td className={styles.alignRight}><span className={`${styles.status} ${user.status === 'Active' ? styles.activeStatus : ''}`}>{user.status}</span></td><td className={styles.alignRight}>{formatAdminDate(user.joinedAt)}</td><td className={styles.actionColumn}>{actions(user)}</td></tr>)}</tbody></table></div>
      <div className={styles.mobileList}>{pagination.items.map((user) => <article key={user.id}><header><div className={styles.person}><Avatar name={user.name} /><span><b>{user.name}</b><small>{user.email}</small></span></div><span className={`${styles.status} ${user.status === 'Active' ? styles.activeStatus : ''}`}>{user.status}</span></header><dl>{role === 'teacher' && <div><dt>Specialization</dt><dd>{user.specialization}</dd></div>}<div><dt>Date added</dt><dd>{formatAdminDate(user.joinedAt)}</dd></div><div><dt>Role</dt><dd>{roles.find((item) => item.id === user.role)?.label}</dd></div></dl>{actions(user)}</article>)}</div>
      {!pagination.items.length && <p className={styles.empty}>No accounts found.</p>}
      <footer><button disabled={pagination.page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><span>Page {pagination.page} of {pagination.totalPages}</span><button disabled={pagination.page === pagination.totalPages} onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}>Next</button></footer>
    </section>
  </div>;
}
