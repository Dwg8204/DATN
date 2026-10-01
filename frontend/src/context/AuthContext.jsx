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
  const authMutation = useRef(0);

  useEffect(() => {
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
      .catch(() => { if (active && authMutation.current === initialRevision) setUser(null); })
      .finally(() => { if (active) setIsAuthReady(true); });
    return () => {
      active = false;
      window.removeEventListener('aptimate:session-expired', clearSession);
    };
  }, []);

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
      isAuthenticated: isAuthReady && Boolean(user),
      login: ({ profile }) => {
        authMutation.current += 1;
        setUser(normalizeProfile(profile));
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
    [isAuthReady, user],
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
