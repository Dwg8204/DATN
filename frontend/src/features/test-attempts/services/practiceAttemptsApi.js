import api from '../../../services/api.js';
import { API_ENDPOINTS } from '../../../services/endpoint.js';

const silent = { notifyOnError: false };

export const practiceAttemptsApi = {
  start: payload => api.post(API_ENDPOINTS.practiceAttempts.list, payload, silent).then(response => response.data),
  get: (attemptId, signal) => api.get(API_ENDPOINTS.practiceAttempts.detail(attemptId), { ...silent, signal }).then(response => response.data),
  reveal: (attemptId, key) => api.post(API_ENDPOINTS.practiceAttempts.reveal(attemptId), { key }, silent).then(response => response.data),
  complete: (attemptId, payload) => api.post(API_ENDPOINTS.practiceAttempts.complete(attemptId), payload, silent).then(response => response.data),
  abandon: attemptId => api.post(API_ENDPOINTS.practiceAttempts.abandon(attemptId), undefined, silent).then(response => response.data),
  result: (attemptId, signal) => api.get(API_ENDPOINTS.practiceAttempts.result(attemptId), { ...silent, signal }).then(response => response.data),
  partResult: (attemptId, partNumber, signal) => api.get(API_ENDPOINTS.practiceAttempts.partResult(attemptId, partNumber), { ...silent, signal }).then(response => response.data),
  history: ({ page = 1, pageSize = 10, component, mode, search, sort, signal } = {}) => api.get(API_ENDPOINTS.practiceAttempts.history, {
    ...silent, signal, params: { page, pageSize, ...(component ? { component } : {}),
      ...(mode && mode !== 'all' ? { mode } : {}), ...(search?.trim() ? { search: search.trim() } : {}), ...(sort ? { sort } : {}) },
  }).then(response => response.data),
  states: (testIds, signal) => api.get(API_ENDPOINTS.practiceAttempts.states, {
    ...silent, signal, params: { testIds: testIds.join(',') },
  }).then(response => response.data),
};
