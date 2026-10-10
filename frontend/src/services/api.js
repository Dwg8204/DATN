import axios from 'axios';
import { normalizeApiError } from './apiError.js';
import { toast } from './toastStore.js';

const api = axios.create({
  baseURL: import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  withCredentials: true,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise = null;
let sessionEpoch = 0;
let logoutDepth = 0;
const publicAuthPath = /\/auth\/(?:login|register|refresh|logout(?:-all)?|forgot-password\/[^/?]+)(?:[/?]|$)/;

export async function runDuringLogout(operation) {
  sessionEpoch += 1;
  logoutDepth += 1;
  try {
    if (refreshPromise) await refreshPromise.catch(() => undefined);
    return await operation();
  } finally {
    logoutDepth -= 1;
  }
}

function reportError(error, request) {
  const normalized = normalizeApiError(error);
  if (!normalized.canceled && request?.notifyOnError !== false && !error.notificationShown) {
    toast.error(normalized.message);
    error.notificationShown = true;
  }
  return Promise.reject(error);
}

async function refreshSession() {
  for (let retry = 0; retry < 8; retry += 1) {
    try {
      return await api.post('/auth/refresh', undefined, { notifyOnError: false, skipAuthRefresh: true });
    } catch (error) {
      if (error.response?.status !== 409 || error.response?.data?.error?.code !== 'REFRESH_TOKEN_STALE' || retry === 7) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }
}

api.interceptors.response.use(
  response => response,
  async error => {
    const request = error.config;
    const canRefresh = request && error.response?.status === 401 && !request._retried
      && request.skipAuthRefresh !== true && logoutDepth === 0 && !publicAuthPath.test(request.url || '');
    if (!canRefresh) return reportError(error, request);

    request._retried = true;
    const requestEpoch = sessionEpoch;
    // All waiting callers share one refresh; the internal call stays silent.
    refreshPromise ??= refreshSession()
      .finally(() => { refreshPromise = null; });
    try {
      await refreshPromise;
    } catch (refreshError) {
      if (typeof window !== 'undefined' && refreshError.response?.status === 401) {
        window.localStorage.removeItem('aptimate.auth.user');
        window.dispatchEvent(new Event('aptimate:session-expired'));
      }
      return reportError(refreshError, request);
    }
    if (requestEpoch !== sessionEpoch || logoutDepth > 0) {
      return Promise.reject(new axios.CanceledError('Session changed while refreshing.'));
    }
    return api(request);
  },
);

export default api;
