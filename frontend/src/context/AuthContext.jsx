import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi } from '../features/auth/services/authApi';
import { profileApi } from '../features/profile/services/profileApi';

const USER_STORAGE_KEY = 'aptimate.auth.user';

const AuthContext = createContext(undefined);

function normalizeProfile(profile) {
  if (!profile) return null;
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
  return { ...profile, fullName, name: fullName };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authConnectionError, setAuthConnectionError] = useState(false);
  const [authCheckRevision, setAuthCheckRevision] = useState(0);
  const authMutation = useRef(0);

  useEffect(() => {
    setIsAuthReady(false);
    setAuthConnectionError(false);
    window.localStorage.removeItem('aptimate.auth.token');
    let active = true;
    const initialRevision = authMutation.current;
    const clearSession = () => {
      authMutation.current += 1;
      if (active) { setUser(null); setIsAuthReady(true); }
    };
    window.addEventListener('aptimate:session-expired', clearSession);
    profileApi.getProfile()
      .catch(() => authApi.me())
      .then(profile => { if (active && authMutation.current === initialRevision) setUser(normalizeProfile(profile)); })
      .catch(error => {
        if (!active || authMutation.current !== initialRevision) return;
        // A connection failure cannot establish that the session expired. Keep the
        // requested builder URL and its local draft until access can be checked again.
        if (!error.response || error.response.status >= 500 || [408, 429].includes(error.response.status)) setAuthConnectionError(true);
        else setUser(null);
      })
      .finally(() => { if (active) setIsAuthReady(true); });
    return () => {
      active = false;
      window.removeEventListener('aptimate:session-expired', clearSession);
    };
  }, [authCheckRevision]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (user) {
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      isAuthReady,
      authConnectionError,
      retryAuth: () => setAuthCheckRevision(revision => revision + 1),
      isAuthenticated: isAuthReady && Boolean(user),
      login: ({ profile }) => {
        authMutation.current += 1;
        setUser(normalizeProfile(profile));
        setAuthConnectionError(false);
        setIsAuthReady(true);
        if (profile) {
          profileApi.getProfile().then(fullProfile => setUser(fullProfile)).catch(() => {});
        }
      },
      logout: async ({ remote = true } = {}) => {
        authMutation.current += 1;
        if (remote) await authApi.logout();
        setUser(null);
        setIsAuthReady(true);
      },
      updateProfile: (updates) => {
        if (!user) return;
        const updatedUser = normalizeProfile({ ...user, ...updates });
        setUser(updatedUser);
      },
    }),
    [isAuthReady, user, authConnectionError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
