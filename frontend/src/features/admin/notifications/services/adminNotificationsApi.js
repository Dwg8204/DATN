import api from '../../../../services/api.js';
import { API_ENDPOINTS } from '../../../../services/endpoint.js';

const silentRequest = { notifyOnError: false };

export const adminNotificationsApi = {
  list: ({ page = 1, pageSize = 100, status, search, signal } = {}) => api.get(API_ENDPOINTS.adminNotifications.list, {
    ...silentRequest,
    signal,
    params: { page, pageSize, ...(status ? { status } : {}), ...(search?.trim() ? { search: search.trim() } : {}) },
  }).then(({ data }) => data),
  create: payload => api.post(API_ENDPOINTS.adminNotifications.list, payload, silentRequest)
    .then(({ data }) => data?.data ?? data),
  uploadAttachment: file => {
    const body = new FormData();
    body.append('file', file);
    return api.post(API_ENDPOINTS.adminMedia.notificationAttachments, body, {
      ...silentRequest,
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(({ data }) => data);
  },
};
