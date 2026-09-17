import api from '../../../../services/api.js';
import { API_ENDPOINTS } from '../../../../services/endpoint.js';

const silent = { notifyOnError: false };

function payload(test, includeVersion = false) {
  return {
    mode: test.mode,
    details: { title: test.details?.title ?? '', pictureUrl: test.details?.pictureUrl ?? '' },
    parts: test.parts ?? {},
    ...(includeVersion ? { version: test.version } : {}),
  };
}

export const writingTestsApi = {
  listAdmin: ({ search, mode, status, page, pageSize, signal } = {}) => api.get(API_ENDPOINTS.adminWritingTests.list, {
    ...silent, signal,
    params: { ...(search?.trim() ? { search: search.trim() } : {}), ...(mode ? { mode } : {}), ...(status && status !== 'All' ? { status } : {}), page, pageSize },
  }).then(response => response.data),
  getAdmin: (id, signal) => api.get(API_ENDPOINTS.adminWritingTests.detail(id), { ...silent, signal }).then(response => response.data),
  create: test => api.post(API_ENDPOINTS.adminWritingTests.list, payload(test), silent).then(response => response.data),
  update: test => api.put(API_ENDPOINTS.adminWritingTests.detail(test.id), payload(test, true), silent).then(response => response.data),
  publish: test => api.post(API_ENDPOINTS.adminWritingTests.publish(test.id), { version: test.version }, silent).then(response => response.data),
  archive: id => api.delete(API_ENDPOINTS.adminWritingTests.detail(id), silent),
  listPublished: ({ search, mode, page, pageSize, signal } = {}) => api.get(API_ENDPOINTS.writingTests.list, {
    ...silent, signal,
    params: { ...(search?.trim() ? { search: search.trim() } : {}), ...(mode ? { mode } : {}), page, pageSize },
  }).then(response => response.data),
  getPublished: (id, signal) => api.get(API_ENDPOINTS.writingTests.detail(id), { ...silent, signal }).then(response => response.data),
  uploadCover: file => {
    const body = new FormData();
    body.append('file', file);
    return api.post(API_ENDPOINTS.adminMedia.testCovers, body, {
      ...silent, timeout: 60_000, headers: { 'Content-Type': 'multipart/form-data' },
    }).then(response => response.data);
  },
};
