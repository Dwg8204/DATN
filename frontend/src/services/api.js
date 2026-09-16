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
const publicAuthPath = /\/auth\/(?:login|register|refresh|logout(?:-all)?|forgot-password\/[^/?]+)(?:[/?]|$)/;

function reportError(error, request) {
  const normalized = normalizeApiError(error);
  if (!normalized.canceled && request?.notifyOnError !== false && !error.notificationShown) {
    toast.error(normalized.message);
    error.notificationShown = true;
  }
  return Promise.reject(error);
}

api.interceptors.response.use(
  response => response,
  async error => {
    const request = error.config;
    const canRefresh = request && error.response?.status === 401 && !request._retried
      && request.skipAuthRefresh !== true && !publicAuthPath.test(request.url || '');
    if (!canRefresh) return reportError(error, request);

    request._retried = true;
    // All waiting callers share one refresh; the internal call stays silent.
    refreshPromise ??= api.post('/auth/refresh', undefined, { notifyOnError: false, skipAuthRefresh: true })
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
    return api(request);
  },
);

export default api;
