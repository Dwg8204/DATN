import api from '../../../services/api';

const options = { notifyOnError: false };
const root = '/vocabulary';
export const studyApi = {
  state: signal => api.get(`${root}/study`, { ...options, signal }).then(r => r.data),
  create: dto => api.post(`${root}/study/items`, dto, options).then(r => r.data),
  update: (id, dto) => api.patch(`${root}/study/items/${id}`, dto, options).then(r => r.data),
  remove: id => api.delete(`${root}/study/items/${id}`, options).then(r => r.data),
  createTopic: dto => api.post(`${root}/folders`, dto, options).then(r => r.data),
  review: dto => api.post(`${root}/notebook/review-event`, dto, options).then(r => r.data),
  submit: dto => api.post(`${root}/dictation/attempts`, dto, options).then(r => r.data),
  importBrowser: dto => api.post(`${root}/study/import-browser`, dto, options).then(r => r.data),
};
