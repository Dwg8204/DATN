import { useMemo, useState } from 'react';
import { Eye, Edit3, LockKeyhole, Plus, Search, Trash2 } from 'lucide-react';
import { AdminConfirmDialog, AdminToast } from '../components/AdminFeedback';
import { formatAdminDate, paginate } from '../utils/testManagerHelpers';
import Modal from '../../../components/common/Modal';
import Pagination from '../../../components/common/Pagination';
import UserEditorDialog from './components/UserEditorDialog';
import { deleteManagedUser, getManagedUsers, saveManagedUser } from './data/userManagementStorage';
import { validateManagedUser } from './validation/userValidation';
import styles from './UserManagementPage.module.css';

const roles = [
  { id: 'admin', label: 'Admin' },
  { id: 'user', label: 'User' },
  { id: 'teacher', label: 'Teacher' },
];
const emptyUser = (role) => ({ id: '', role, name: '', email: '', status: 'Active', password: '', confirmPassword: '' });

function Avatar({ name }) {
  return <span className={styles.avatar}>{name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState(getManagedUsers);
  const [role, setRole] = useState('admin');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmRole, setConfirmRole] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState('');
  const filtered = useMemo(() => users.filter((user) => user.role === role && `${user.name} ${user.email}`.toLowerCase().includes(query.trim().toLowerCase())), [users, role, query]);
  const [pageSize, setPageSize] = useState(5);
  const pagination = paginate(filtered, page, pageSize);
  const changeRole = (nextRole) => { setRole(nextRole); setQuery(''); setPage(1); };
  const save = async () => {
    if (busy) return;
    const error = validateManagedUser(editor, users);
    if (error) return setEditorError(error);
    if (editor.id && !confirmRole) {
      if (users.find(u => u.id === editor.id)?.role === editor.role) return setEditorError('Choose the new role before saving.');
      setConfirmRole(true); return;
    }
    setBusy(true);
    try {
      await saveManagedUser(editor);
      setUsers(getManagedUsers()); setEditor(null); setEditorError('');
      setToast(editor.id ? 'Account role updated successfully.' : 'Account created successfully.');
    } catch (error) { setEditorError(error.message || 'Unable to save account.'); }
    finally { setBusy(false); setConfirmRole(false); }
  };
  const remove = () => {
    try { if (deleteManagedUser(deleteTarget.id)) { setUsers(getManagedUsers()); setToast('Account deleted successfully.'); } } catch { setEditorError('Unable to delete account.'); }
    setDeleteTarget(null);
  };
  const actions = (user) => {
    const locked = user.role === 'admin';
    return <div className={styles.actions}>
      <button title="View details" aria-label={`View ${user.name}`} onClick={() => setDetail(user)}><Eye /></button>
      <button disabled={locked} title={locked ? 'Admin accounts cannot be edited' : 'Edit'} aria-label={`Edit ${user.name}`} onClick={() => { setEditor({ ...user }); setEditorError(''); }}>{locked ? <LockKeyhole /> : <Edit3 />}</button>
      <button disabled={locked} title={locked ? 'Admin accounts cannot be deleted' : 'Delete'} aria-label={`Delete ${user.name}`} onClick={() => setDeleteTarget(user)}><Trash2 /></button>
    </div>;
  };
  return <div className={styles.page}>
    <AdminToast message={editor && !confirmRole ? '' : editorError} type="error" onClose={() => setEditorError('')} />
    {detail && <Modal title="Account details" onClose={() => setDetail(null)}><dl>{[['Full name',detail.name],['Email',detail.email],['Role',detail.role],['Status',detail.status],['Date added',formatAdminDate(detail.joinedAt)]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></Modal>}
    <AdminConfirmDialog open={confirmRole} title="Confirm role change?" message={editor ? `Promote ${editor.name} to ${editor.role}? This changes their account permissions.` : ''} confirmLabel="Confirm" onCancel={() => setConfirmRole(false)} onConfirm={save} />
    <AdminToast message={toast} onClose={() => setToast('')} />
    <AdminConfirmDialog open={Boolean(deleteTarget)} title="Delete this account?" message={deleteTarget ? `“${deleteTarget.name}” will permanently lose access to AptiMate. This action cannot be undone.` : ''} onCancel={() => setDeleteTarget(null)} onConfirm={remove} />
    <UserEditorDialog user={confirmRole ? null : editor} error={editorError} onClearError={() => setEditorError('')} busy={busy} originalRole={users.find(u => u.id === editor?.id)?.role} onChange={(field, value) => { setEditor((current) => ({ ...current, [field]: value })); setEditorError(''); }} onCancel={() => { if (!busy) { setEditor(null); setEditorError(''); } }} onSave={save} />
    <header className={styles.toolbar}>
      <nav className={styles.components} aria-label="Account type">{roles.map((item) => <button className={role === item.id ? styles.activeComponent : ''} onClick={() => changeRole(item.id)} key={item.id}>{item.label}</button>)}</nav>
      <div className={styles.tools}><label><Search /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search people" /></label><button className={styles.add} onClick={() => { setEditor(emptyUser(role)); setEditorError(''); }}><Plus />Add {role}</button></div>
    </header>
    <section className={styles.panel}>
      <header><div><h2>Team members</h2><span>{filtered.length} {filtered.length === 1 ? 'account' : 'accounts'}</span></div></header>
      <div className={styles.tableWrap}><table><thead><tr><th>Name</th><th className={styles.alignRight}>Status</th><th className={styles.alignRight}>Date added</th><th className={styles.actionColumn}>Actions</th></tr></thead><tbody>{pagination.items.map((user) => <tr key={user.id}><td><div className={styles.person}><Avatar name={user.name} /><span><b>{user.name}</b><small>{user.email}</small></span></div></td><td className={styles.alignRight}><span className={`${styles.status} ${user.status === 'Active' ? styles.activeStatus : ''}`}>{user.status}</span></td><td className={styles.alignRight}>{formatAdminDate(user.joinedAt)}</td><td className={styles.actionColumn}>{actions(user)}</td></tr>)}</tbody></table></div>
      <div className={styles.mobileList}>{pagination.items.map((user) => <article key={user.id}><header><div className={styles.person}><Avatar name={user.name} /><span><b>{user.name}</b><small>{user.email}</small></span></div><span className={`${styles.status} ${user.status === 'Active' ? styles.activeStatus : ''}`}>{user.status}</span></header><dl><div><dt>Date added</dt><dd>{formatAdminDate(user.joinedAt)}</dd></div><div><dt>Role</dt><dd>{roles.find((item) => item.id === user.role)?.label}</dd></div></dl>{actions(user)}</article>)}</div>
      {!pagination.items.length && <p className={styles.empty}>No accounts found.</p>}
      <Pagination page={page} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </section>
  </div>;
}
