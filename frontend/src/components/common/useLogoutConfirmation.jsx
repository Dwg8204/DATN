import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUiTranslation } from '../../i18n/useUiTranslation.jsx';
import ConfirmModal from './ConfirmModal';

export default function useLogoutConfirmation() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const ui = useUiTranslation();
  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
      setOpen(false);
      navigate('/', { replace: true });
    } catch {
      // Existing API error handling reports the failure; keep the dialog available.
    } finally { setBusy(false); }
  };
  return {
    requestLogout: () => setOpen(true),
    signingOut: busy,
    logoutDialog: open ? <ConfirmModal title={ui('Log out')} message={ui('Are you sure you want to log out?')} confirmText={ui('Log out')} cancelText={ui('Cancel')} busy={busy} onCancel={() => setOpen(false)} onConfirm={confirm} /> : null,
  };
}
