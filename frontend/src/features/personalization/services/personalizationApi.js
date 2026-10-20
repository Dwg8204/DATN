import api from '../../../services/api';

const options = { notifyOnError: false };
const data = response => response.data;
export const personalizationApi = {
  reports: (params = {}) => api.get('/me/reports', { ...options, params }).then(data),
  report: id => api.get(`/me/reports/${encodeURIComponent(id)}`, options).then(data),
  comment: () => api.get('/me/insights/comment', options).then(data),
  goal: () => api.get('/me/learning-goal', options).then(data),
  create: payload => api.post('/me/learning-goal', payload, options).then(data),
  replace: payload => api.post('/me/learning-goal/replace', payload, options).then(data),
  cancel: goalId => api.delete('/me/learning-goal', { ...options, data: { goalId } }).then(data),
  finish: goalId => api.post('/me/learning-goal/finish', { goalId }, options).then(data),
  history: page => api.get('/me/learning-goals', { ...options, params: { page } }).then(data),
  preferences: () => api.get('/me/learning-preferences', options).then(data),
  savePreferences: payload => api.put('/me/learning-preferences', payload, options).then(data),
  plan: () => api.get('/me/study-plan/current', options).then(data),
  mistakes: itemId => api.get('/me/mistakes', { ...options, params: { itemId } }).then(data),
  markReviewed: itemId => api.post(`/me/study-plan/items/${encodeURIComponent(itemId)}/done`, {}, options).then(data),
};
