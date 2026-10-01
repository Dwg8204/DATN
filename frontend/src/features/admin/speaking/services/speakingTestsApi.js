import api from '../../../../services/api';

export const speakingTestsApi = {
  // --- Admin/Teacher endpoints ---
  list: async ({ signal, ...params }) => {
    const res = await api.get('/speaking-tests', { params, signal });
    return res.data;
  },

  getOne: async (id) => {
    const res = await api.get(`/speaking-tests/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/speaking-tests', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.patch(`/speaking-tests/${id}`, data);
    return res.data;
  },

  publish: async (id, version) => {
    const res = await api.post(`/speaking-tests/${id}/publish`, { version });
    return res.data;
  },

  archive: async (id) => {
    const res = await api.delete(`/speaking-tests/${id}`);
    return res.data;
  },

  // --- Learner endpoints ---
  listPublished: async ({ signal, ...params } = {}) => {
    const res = await api.get('/speaking-tests/published', { params, signal });
    return res.data;
  },

  getPublished: async (id) => {
    const res = await api.get(`/speaking-tests/published/${id}`);
    return res.data;
  }
};
