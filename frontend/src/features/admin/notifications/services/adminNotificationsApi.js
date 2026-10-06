import api from '../../../../services/api.js';
import { API_ENDPOINTS } from '../../../../services/endpoint.js';

const silentRequest = { notifyOnError: false };

export const adminNotificationsApi = {
  list: ({ page = 1, pageSize = 100, status } = {}) => api.get(API_ENDPOINTS.adminNotifications.list, {
    ...silentRequest,
    params: { page, pageSize, ...(status ? { status } : {}) },
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
