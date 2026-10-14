import api from '../../../services/api';

const options = { notifyOnError: false };
export const commentsApi = {
  list: (skill, page, signal) => api.get('/comments', { ...options, params: { skill, page }, signal }).then(({ data }) => data.data),
  create: (skill, content, replyToId) => api.post('/comments', { skill, content, ...(replyToId ? { replyToId } : {}) }, options).then(({ data }) => data.data),
  remove: (skill, id) => api.delete(`/comments/${id}`, { ...options, params: { skill } }),
};
