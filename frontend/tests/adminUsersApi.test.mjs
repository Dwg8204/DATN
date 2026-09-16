import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import api from '../src/services/api.js';
import { adminUsersApi } from '../src/features/admin/users/services/adminUsersApi.js';
import { toTeacherPayload, validateTeacherForm } from '../src/features/admin/users/validation/userFormValidation.js';

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

test('teacher creation cannot inject an admin role or status', async () => {
  let request;
  api.defaults.adapter = async config => {
    request = config;
    return response(config, { id: 'teacher-1', role: 'TEACHER' }, 201);
  };
  const form = {
    firstName: '  Mai ', lastName: ' Anh  ', email: ' MAI@EXAMPLE.COM ',
    password: 'teacher-password', confirmPassword: 'teacher-password', role: 'ADMIN', status: 'BANNED',
  };
  assert.equal(validateTeacherForm(form), '');
  await adminUsersApi.createTeacher(toTeacherPayload(form));
  assert.deepEqual(JSON.parse(request.data), {
    firstName: 'Mai', lastName: 'Anh', email: 'mai@example.com',
    password: 'teacher-password', confirmPassword: 'teacher-password',
  });
});

test('promotion always submits the only permitted target role', async () => {
  let request;
  api.defaults.adapter = async config => {
    request = config;
    return response(config, { id: 'student-1', role: 'TEACHER' });
  };
  await adminUsersApi.promoteToTeacher('student-1');
  assert.equal(request.method, 'patch');
  assert.equal(request.url, '/admin/users/student-1/role');
  assert.deepEqual(JSON.parse(request.data), { role: 'TEACHER' });
});

test('teacher validation returns one clear error at a time', () => {
  const blank = { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' };
  assert.equal(validateTeacherForm(blank), 'Enter the teacher’s first name.');
  assert.equal(validateTeacherForm({ ...blank, firstName: 'Mai' }), 'Enter the teacher’s last name.');
  assert.equal(validateTeacherForm({ ...blank, firstName: 'Mai', lastName: 'Anh' }), 'Enter a valid email address.');
});
