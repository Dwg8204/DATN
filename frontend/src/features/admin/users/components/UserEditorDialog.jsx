import { useUiTranslation } from "../../../../i18n/useUiTranslation.jsx";
import { AdminToast } from '../../components/AdminFeedback';
import Modal from '../../../../components/common/Modal';
import PasswordInput from '../../../auth/components/PasswordInput';
import AnswerSelect from '../../../../components/common/AnswerSelect';
export default function UserEditorDialog({ user, originalRole, onChange, onCancel, onSave, busy, error, onClearError }) {
  const ui = useUiTranslation();
  if (!user) return null;
  const editing = Boolean(user.id);
  return <Modal title={editing ? ui("Promote user") : ui("Add teacher")} onClose={onCancel}>
    <AdminToast message={error} type="error" onClose={onClearError} />
    <form noValidate onSubmit={e => { e.preventDefault(); if (!busy) onSave(); }}>
      {editing ? <label>{ui("Full name")}<input readOnly value={user.fullName} /></label> : <>
        <label>{ui("First name")}<input autoFocus maxLength={100} value={user.firstName} onChange={e => onChange('firstName', e.target.value)} /></label>
        <label>{ui("Last name")}<input maxLength={100} value={user.lastName} onChange={e => onChange('lastName', e.target.value)} /></label>
      </>}
      <label>{ui("Email address")}<input type="email" maxLength={254} readOnly={editing} value={user.email} onChange={e => onChange('email', e.target.value)} /></label>
      {editing ? <label>{ui("Role")}<AnswerSelect translateLabels value={user.role} onChange={e => onChange('role', e.target.value)} options={[{value:originalRole,label:'User'},{value:'TEACHER',label:'Teacher'}]} ariaLabel={ui("Role")}/></label> : <>
        <label>{ui("Password")}<PasswordInput autoComplete="new-password" maxLength={128} value={user.password} onChange={e => onChange('password', e.target.value)} /></label>
        <label>{ui("Confirm password")}<PasswordInput autoComplete="new-password" maxLength={128} value={user.confirmPassword} onChange={e => onChange('confirmPassword', e.target.value)} /></label>
      </>}
      <footer><button type="button" onClick={onCancel} disabled={busy}>{ui("Cancel")}</button><button type="submit" disabled={busy}>{busy ? ui("Saving…") : editing ? ui("Promote to Teacher") : ui("Create teacher")}</button></footer>
    </form>
  </Modal>;
}
