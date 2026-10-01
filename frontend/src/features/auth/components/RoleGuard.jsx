import { useEffect } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { hasAnyRole } from '../utils/authorization';
import styles from './RoleGuard.module.css';

export default function RoleGuard({ allowedRoles, children }) {
  const { user, isAuthReady } = useAuth();
  const { showError } = useToast();
  const location = useLocation();
  const authenticated = Boolean(user);
  const authorized = authenticated && hasAnyRole(user.role, allowedRoles);

  useEffect(() => {
    if (!isAuthReady) return;
    if (!authenticated) showError('Please sign in to continue.');
    else if (!authorized) showError('You do not have permission to access this page.');
  }, [authenticated, authorized, isAuthReady, showError]);

  if (!isAuthReady) {
    return <div className={styles.loading} role="status"><LoaderCircle aria-hidden="true" /><span>Checking access...</span></div>;
  }
  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  if (!authorized) return <Navigate to="/" replace />;
  return children;
}
