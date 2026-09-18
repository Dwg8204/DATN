import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import api from '../src/services/api.js';
import { grammarTestsApi } from '../src/features/admin/grammar/services/grammarTestsApi.js';

const originalAdapter = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = originalAdapter; });

const response = (config, data = {}, status = 200) => ({ config, data, status, statusText: '', headers: {} });

test('grammar admin list forwards server-side filters and pagination', async () => {
  let request;
  api.defaults.adapter = async config => {
    request = config;
    return response(config, { data: [], pagination: { page: 3, pageSize: 20, totalItems: 44, totalPages: 3 } });
  };
  const result = await grammarTestsApi.listAdmin({ search: '  mock  ', mode: 'part2', status: 'DRAFT', page: 3, pageSize: 20 });
  assert.equal(request.url, '/admin/grammar-tests');
  assert.deepEqual(request.params, { search: 'mock', mode: 'part2', status: 'DRAFT', page: 3, pageSize: 20 });
  assert.equal(result.pagination.totalItems, 44);
});

test('grammar create sends only the aggregate authoring contract', async () => {
  let request;
  api.defaults.adapter = async config => {
    request = config;
    return response(config, { id: 'test-id', version: 1 }, 201);
  };
  await grammarTestsApi.create({
    mode: 'part1', version: 999, status: 'PUBLISHED', createdBy: 'spoofed',
    details: { title: 'Test', pictureUrl: 'https://res.cloudinary.com/demo/image/upload/test.jpg' },
    parts: { 1: { instruction: '', questions: [] } },
  });
  const body = JSON.parse(request.data);
  assert.equal(request.method, 'post');
  assert.equal(body.version, undefined);
  assert.equal(body.status, undefined);
  assert.equal(body.createdBy, undefined);
  assert.deepEqual(body.details.cover, { url: body.details.pictureUrl });
});

test('grammar update submits optimistic version and publish uses saved version', async () => {
  const requests = [];
  api.defaults.adapter = async config => {
    requests.push(config);
    return response(config, { id: 'test-id', version: 4 });
  };
  const aggregate = { id: 'test-id', mode: 'part2', version: 4, details: { title: 'Vocabulary' }, parts: { 2: { sets: [] } } };
  await grammarTestsApi.update(aggregate);
  await grammarTestsApi.publish(aggregate);
  assert.equal(JSON.parse(requests[0].data).version, 4);
  assert.deepEqual(JSON.parse(requests[1].data), { version: 4 });
});

