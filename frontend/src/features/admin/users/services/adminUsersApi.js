import api from '../../../../services/api.js';
import { API_ENDPOINTS } from '../../../../services/endpoint.js';

const silentRequest = { notifyOnError: false };

export const adminUsersApi = {
  list: ({ role, status, search, page, pageSize, signal } = {}) => api.get(API_ENDPOINTS.adminUsers.list, {
    ...silentRequest,
    signal,
    params: {
      role,
      ...(status ? { status } : {}),
      ...(search?.trim() ? { search: search.trim() } : {}),
      page,
      pageSize,
    },
  }).then(({ data }) => data),

  detail: (id, signal) => api.get(API_ENDPOINTS.adminUsers.detail(id), {
    ...silentRequest,
    signal,
  }).then(({ data }) => data),

  createTeacher: payload => api.post(API_ENDPOINTS.adminUsers.list, payload, silentRequest)
    .then(({ data }) => data),

  promoteToTeacher: id => api.patch(API_ENDPOINTS.adminUsers.role(id), { role: 'TEACHER' }, silentRequest)
    .then(({ data }) => data),

  remove: id => api.delete(API_ENDPOINTS.adminUsers.detail(id), silentRequest),
};
