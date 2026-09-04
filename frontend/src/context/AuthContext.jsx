import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AUTH_STORAGE_KEY = 'aptimate.auth.token';
const USER_STORAGE_KEY = 'aptimate.auth.user';

const AuthContext = createContext(undefined);

function readStorage(key) {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(key);
}

function readUser() {
  const rawUser = readStorage(USER_STORAGE_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readStorage(AUTH_STORAGE_KEY));
  const [user, setUser] = useState(() => readUser());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (token) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [token]);

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
      token,
      user,
      isAuthenticated: Boolean(token),
      login: ({ accessToken, profile }) => {
        setToken(accessToken);
        setUser(profile ?? null);
      },
      logout: () => {
        setToken(null);
        setUser(null);
      },
      updateProfile: (updates) => {
        if (!user) return;
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);

        // Update mock_users in localStorage
        try {
          const existingUsers = JSON.parse(localStorage.getItem('aptimate.mock_users') || '[]');
          const userIndex = existingUsers.findIndex(u => u.email === user.email);
          if (userIndex !== -1) {
            existingUsers[userIndex] = { ...existingUsers[userIndex], ...updates };
            localStorage.setItem('aptimate.mock_users', JSON.stringify(existingUsers));
          }
        } catch (e) {
          console.error("Failed to update mock users in localStorage", e);
        }
      },
    }),
    [token, user],
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
