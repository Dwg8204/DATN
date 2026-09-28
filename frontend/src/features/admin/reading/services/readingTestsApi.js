import api from '../../../../services/api.js';

const toApi = test => ({
  mode: test.mode,
  purpose: test.purpose,
  details: test.details,
  parts: Object.fromEntries([1, 2, 3, 4]
    .filter(number => test.mode === 'full' || test.mode === `part${number}`)
    .map(number => [String(number), test[`part${number}`]])),
});
const fromApi = test => ({ ...test, ...Object.fromEntries([1, 2, 3, 4]
  .filter(number => test.parts?.[String(number)])
  .map(number => [`part${number}`, test.parts[String(number)]])) });

export const readingTestsApi = {
  list: ({ signal, ...params }) => api.get('/reading-tests', { params, signal }).then(response => response.data),
  listPublished: ({ signal, ...params } = {}) => api.get('/reading-tests/published', { params, signal }).then(response => response.data),
  getOne: id => api.get(`/reading-tests/${id}`).then(response => fromApi(response.data)),
  getPublished: id => api.get(`/reading-tests/published/${id}`).then(response => fromApi(response.data)),
  create: test => api.post('/reading-tests', toApi(test)).then(response => fromApi(response.data)),
  update: (id, test) => api.patch(`/reading-tests/${id}`, { ...toApi(test), version: test.version }).then(response => fromApi(response.data)),
  publish: (id, version) => api.post(`/reading-tests/${id}/publish`, { version }).then(response => fromApi(response.data)),
  archive: id => api.delete(`/reading-tests/${id}`),
};
