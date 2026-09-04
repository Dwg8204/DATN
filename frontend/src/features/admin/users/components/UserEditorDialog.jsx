import { X } from 'lucide-react';
import styles from './UserEditorDialog.module.css';

export default function UserEditorDialog({ user, error, onChange, onCancel, onSave }) {
  if (!user) return null;
  const editing = Boolean(user.id);
  const roleOptions = user.role === 'user' ? ['user', 'teacher'] : user.role === 'teacher' ? ['teacher', 'admin'] : ['admin'];
  return <div className={styles.backdrop}><form className={styles.dialog} onSubmit={(event) => { event.preventDefault(); onSave(); }}>
    <header><div><h2>{editing ? 'Change account role' : 'Add account'}</h2><p>{editing ? 'Account identity is read-only. Roles can only be promoted to a higher permission level.' : 'Enter the information for the new AptiMate account.'}</p></div><button type="button" onClick={onCancel} aria-label="Close"><X /></button></header>
    <label><span>Full name</span><input autoFocus={!editing} readOnly={editing} value={user.name} onChange={(event) => onChange('name', event.target.value)} /></label>
    <label><span>Email address</span><input type="email" readOnly={editing} value={user.email} onChange={(event) => onChange('email', event.target.value)} /></label>
    {editing && <label><span>Role</span><select autoFocus value={user.role} onChange={(event) => onChange('role', event.target.value)}>{roleOptions.map((role) => <option value={role} key={role}>{role === 'user' ? 'User' : role === 'teacher' ? 'Teacher' : 'Admin'}</option>)}</select></label>}
    {user.role === 'teacher' && <label><span>Specialization</span><input value={user.specialization || ''} onChange={(event) => onChange('specialization', event.target.value)} placeholder="e.g. Reading" /></label>}
    {!editing && <label><span>Status</span><select value={user.status} onChange={(event) => onChange('status', event.target.value)}><option>Active</option><option>Inactive</option></select></label>}
    {error && <p className={styles.error}>{error}</p>}
    <footer><button type="button" onClick={onCancel}>Cancel</button><button className={styles.save}>{editing ? 'Update role' : 'Save account'}</button></footer>
  </form></div>;
}
