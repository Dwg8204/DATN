import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import api from '../src/services/api.js';
import { writingTestsApi } from '../src/features/admin/writing/services/writingTestsApi.js';

const originalAdapter = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = originalAdapter; });
const response = (config, data = {}, status = 200) => ({ config, data, status, statusText: '', headers: {} });

test('Writing management list sends skill, scope, status and pagination to the backend', async () => {
  let request;
  api.defaults.adapter = async config => {
    request = config;
    return response(config, { data: [], pagination: { page: 2, pageSize: 5, totalItems: 8, totalPages: 2 } });
  };
  const result = await writingTestsApi.listAdmin({ search: '  email  ', mode: 'part4', status: 'DRAFT', page: 2, pageSize: 5 });
  assert.equal(request.url, '/admin/writing-tests');
  assert.deepEqual(request.params, { search: 'email', mode: 'part4', status: 'DRAFT', page: 2, pageSize: 5 });
  assert.equal(result.pagination.totalItems, 8);
});

test('Writing creation sends only the authoring aggregate and the cover URL', async () => {
  let request;
  api.defaults.adapter = async config => {
    request = config;
    return response(config, { id: 'test-id', version: 1 }, 201);
  };
  await writingTestsApi.create({
    mode: 'part1', version: 99, status: 'PUBLISHED', createdBy: 'spoofed',
    details: { title: 'Writing practice', pictureUrl: 'https://res.cloudinary.com/demo/image/upload/cover.jpg', cover: { publicId: 'ignored' } },
    parts: { 1: { context: 'Context', questions: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'], sampleAnswers: ['A1', 'A2', 'A3', 'A4', 'A5'] } },
  });
  const body = JSON.parse(request.data);
  assert.equal(request.method, 'post');
  assert.equal(body.version, undefined);
  assert.equal(body.status, undefined);
  assert.equal(body.createdBy, undefined);
  assert.deepEqual(body.details, { title: 'Writing practice', pictureUrl: 'https://res.cloudinary.com/demo/image/upload/cover.jpg' });
});

test('Writing update uses optimistic version and publish forwards that saved version', async () => {
  const requests = [];
  api.defaults.adapter = async config => {
    requests.push(config);
    return response(config, { id: 'test-id', version: 3 });
  };
  const aggregate = { id: 'test-id', mode: 'full', version: 3, details: { title: 'Four parts' }, parts: {} };
  await writingTestsApi.update(aggregate);
  await writingTestsApi.publish(aggregate);
  assert.equal(requests[0].url, '/admin/writing-tests/test-id');
  assert.equal(JSON.parse(requests[0].data).version, 3);
  assert.equal(requests[1].url, '/admin/writing-tests/test-id/publish');
  assert.deepEqual(JSON.parse(requests[1].data), { version: 3 });
});

