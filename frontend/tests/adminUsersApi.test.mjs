import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import api from '../src/services/api.js';
import { adminUsersApi } from '../src/features/admin/users/services/adminUsersApi.js';

const originalAdapter = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = originalAdapter; });

function response(config, data = {}, status = 200) {
  return { config, data, status, statusText: '', headers: {} };
}

test('user list forwards server-side role, search and pagination filters', async () => {
  let request;
  api.defaults.adapter = async config => {
    request = config;
    return response(config, { data: [], pagination: { page: 2, pageSize: 5, totalItems: 7, totalPages: 2 } });
  };

  const result = await adminUsersApi.list({ role: 'STUDENT', search: '  Linh  ', page: 2, pageSize: 5 });
  assert.equal(request.method, 'get');
  assert.equal(request.url, '/admin/users');
  assert.deepEqual(request.params, { role: 'STUDENT', search: 'Linh', page: 2, pageSize: 5 });
  assert.equal(request.notifyOnError, false);
  assert.equal(result.pagination.totalItems, 7);
});

test('deleting a user uses the account endpoint', async () => {
  let request;
  api.defaults.adapter = async config => { request = config; return response(config, {}, 204); };
  await adminUsersApi.remove('student-1');
  assert.equal(request.method, 'delete');
  assert.equal(request.url, '/admin/users/student-1');
});
