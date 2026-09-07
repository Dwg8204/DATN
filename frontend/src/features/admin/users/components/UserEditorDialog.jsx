import { AdminToast } from '../../components/AdminFeedback';
import Modal from '../../../../components/common/Modal';
import PasswordInput from '../../../auth/components/PasswordInput';
import AnswerSelect from '../../../../components/common/AnswerSelect';
export default function UserEditorDialog({ user, originalRole, onChange, onCancel, onSave, busy, error, onClearError }) {
  if (!user) return null;
  const editing = Boolean(user.id);
  const promotion = originalRole === 'user' ? 'teacher' : originalRole === 'teacher' ? 'admin' : null;
  return <Modal title={editing ? 'Change account role' : 'Add account'} onClose={onCancel}>
    <AdminToast message={error} type="error" onClose={onClearError} />
    <form noValidate onSubmit={e => { e.preventDefault(); if (!busy) onSave(); }}>
      <label>Full name<input autoFocus={!editing} maxLength={100} readOnly={editing} value={user.name} onChange={e => onChange('name', e.target.value)} /></label>
      <label>Email address<input type="email" maxLength={254} readOnly={editing} value={user.email} onChange={e => onChange('email', e.target.value)} /></label>
      {editing ? <label>Role<AnswerSelect value={user.role} onChange={e => onChange('role', e.target.value)} options={[{value:originalRole,label:originalRole},...(promotion?[{value:promotion,label:promotion}]:[])]} ariaLabel="Role"/></label> : <>
        <label>Password<PasswordInput autoComplete="new-password" maxLength={128} value={user.password} onChange={e => onChange('password', e.target.value)} /></label>
        <label>Confirm password<PasswordInput autoComplete="new-password" maxLength={128} value={user.confirmPassword} onChange={e => onChange('confirmPassword', e.target.value)} /></label>
        <label>Status<AnswerSelect value={user.status} onChange={e => onChange('status', e.target.value)} options={['Active','Inactive']} ariaLabel="Status"/></label>
      </>}
      <footer><button type="button" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Update role' : 'Create account'}</button></footer>
    </form>
  </Modal>;
}
