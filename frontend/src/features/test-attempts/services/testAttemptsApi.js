import api from '../../../services/api.js';
import { API_ENDPOINTS } from '../../../services/endpoint.js';

const silent = { notifyOnError: false };

export const testAttemptsApi = {
  start: ({ testId, attemptId, mode }) => api.post(API_ENDPOINTS.testAttempts.list,
    { testId, attemptId, mode }, silent).then(response => response.data),
  get: (attemptId, signal) => api.get(API_ENDPOINTS.testAttempts.detail(attemptId),
    { ...silent, signal }).then(response => response.data),
  saveProgress: (attemptId, payload) => api.patch(API_ENDPOINTS.testAttempts.progress(attemptId), payload, silent)
    .then(response => response.data),
  submit: (attemptId, payload) => api.post(API_ENDPOINTS.testAttempts.submit(attemptId), payload, silent)
    .then(response => response.data),
  result: (attemptId, signal) => api.get(API_ENDPOINTS.testAttempts.result(attemptId),
    { ...silent, signal }).then(response => response.data),
  partResult: (attemptId, partNumber, signal) => api.get(API_ENDPOINTS.testAttempts.partResult(attemptId, partNumber),
    { ...silent, signal }).then(response => response.data),
  history: ({ page = 1, pageSize = 10, component, mode, search, sort, signal } = {}) => api.get(API_ENDPOINTS.testAttempts.history, {
    ...silent, signal, params: { page, pageSize, ...(component ? { component } : {}),
      ...(mode && mode !== 'all' ? { mode } : {}), ...(search?.trim() ? { search: search.trim() } : {}), ...(sort ? { sort } : {}) },
  }).then(response => response.data),
  states: (testIds, signal) => api.get(API_ENDPOINTS.testAttempts.states, {
    ...silent, signal, params: { testIds: testIds.join(',') },
  }).then(response => response.data),
};
