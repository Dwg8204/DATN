import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AxiosError } from 'axios';
import api from '../src/services/api.js';
import { normalizeApiError, getApiError } from '../src/services/apiError.js';
import { getToastSnapshot, subscribeToToasts, toast } from '../src/services/toastStore.js';
import { getFirstValidationError } from '../src/utils/validationErrors.js';

const originalAdapter = api.defaults.adapter;
afterEach(() => {
  api.defaults.adapter = originalAdapter;
  toast.dismiss();
});

function response(config, status, data = {}) {
  return { config, status, data, statusText: '', headers: {} };
}

function reject(config, status, data) {
  throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, {}, response(config, status, data));
}

test('normalizes business errors without rendering HTTP or internal details', () => {
  const normalize = (status, data) => normalizeApiError({ response: { status, data } });
  assert.match(normalize(401, { error: { code: 'INVALID_CREDENTIALS' } }).message, /Incorrect email or password/);
  assert.match(normalize(400, { error: { code: 'OTP_INVALID_OR_EXPIRED' } }).message, /verification code/);
  assert.match(normalize(404, { message: 'Cannot POST /api/auth/register' }).message, /could not be found/);
  assert.match(normalize(502, '<html>nginx proxy failure</html>').message, /temporarily unavailable/);
  assert.match(normalize(500, { error: { message: 'password_hash SQLSTATE secret' } }).message, /Something went wrong on our side/);
  assert.match(normalize(503, { error: { code: 'EMAIL_DELIVERY_FAILED', message: 'SMTP credentials secret' } }).message, /could not send the email/);
  assert.match(normalize(429, { message: 'ThrottlerException' }).message, /Too many attempts/);
});

test('keeps useful validation, request IDs and only the first form error', () => {
  const fieldErrors = [{ field: 'email', code: 'INVALID_VALUE', message: 'Enter a valid email address.' }];
  const normalized = normalizeApiError({ response: { status: 400, data: {
    error: { code: 'VALIDATION_ERROR', message: 'Enter a valid email address.', fieldErrors }, requestId: 'request-123',
  } } });
  assert.equal(normalized.message, fieldErrors[0].message);
  assert.equal(normalized.requestId, 'request-123');
  assert.deepEqual(normalized.fieldErrors, fieldErrors);
  assert.equal(getApiError({ response: { status: 400, data: { message: ['First problem.', 'Second problem.'] } } }), 'First problem.');
  assert.equal(getFirstValidationError({ title: '', parts: [null, { answer: 'Select an answer.', explanation: 'Too long.' }] }), 'Select an answer.');
});

test('network errors, timeouts and cancellation get distinct treatment', () => {
  assert.match(getApiError({ code: 'ERR_NETWORK', request: {} }), /Unable to connect/);
  assert.match(getApiError({ code: 'ECONNABORTED' }), /took too long/);
  assert.equal(normalizeApiError({ code: 'ERR_CANCELED' }).canceled, true);
  assert.equal(getApiError(new Error('secret internal error'), 'Please try again.'), 'Please try again.');
});

test('the toast store replaces the current notification and ignores stale dismissals', () => {
  let updates = 0;
  const unsubscribe = subscribeToToasts(() => { updates += 1; });
  toast.error('First error');
  const first = getToastSnapshot();
  toast.success('Saved');
  toast.dismiss(first.id);
  assert.equal(getToastSnapshot().message, 'Saved');
  assert.equal(getToastSnapshot().type, 'success');
  assert.equal(updates, 2);
  toast.dismiss(getToastSnapshot().id);
  assert.equal(getToastSnapshot(), null);
  unsubscribe();
});

test('all successful 2xx responses pass through without error notifications', async () => {
  for (const status of [200, 201, 202, 204]) {
    api.defaults.adapter = async config => response(config, status);
    assert.equal((await api.post('/tests')).status, status);
    assert.equal(getToastSnapshot(), null);
  }
  assert.equal(api.defaults.withCredentials, true);
});

test('login and OTP failures never refresh or automatically notify form-owned requests', async () => {
  const calls = [];
  api.defaults.adapter = async config => {
    calls.push(config.url);
    reject(config, 401, { error: { code: 'INVALID_CREDENTIALS' } });
  };
  for (const url of ['/auth/login', '/auth/forgot-password/verify-otp', '/auth/forgot-password/reset']) {
    await assert.rejects(api.post(url, {}, { notifyOnError: false }));
  }
  assert.equal(calls.length, 3);
  assert.equal(calls.includes('/auth/refresh'), false);
  assert.equal(getToastSnapshot(), null);
});

test('background anonymous session checks stay silent even when refresh fails', async () => {
  const calls = [];
  api.defaults.adapter = async config => {
    calls.push(config.url);
    reject(config, 401, { error: { code: 'REFRESH_TOKEN_REQUIRED' } });
  };
  await assert.rejects(api.get('/auth/me', { notifyOnError: false }));
  assert.deepEqual(calls, ['/auth/me', '/auth/refresh']);
  assert.equal(getToastSnapshot(), null);
});

test('concurrent expired requests share one cookie refresh and retry successfully', async () => {
  let refreshes = 0;
  api.defaults.adapter = async config => {
    if (config.url === '/auth/refresh') {
      refreshes += 1;
      await new Promise(resolve => setTimeout(resolve, 10));
      return response(config, 204);
    }
    if (!config._retried) reject(config, 401, {});
    return response(config, 200, { saved: true });
  };
  const results = await Promise.all([api.get('/protected/first'), api.get('/protected/second')]);
  assert.equal(refreshes, 1);
  assert.ok(results.every(result => result.data.saved));
  assert.equal(getToastSnapshot(), null);
});

test('a failed retry is not mistaken for another refresh failure and notifies once', async () => {
  let updates = 0;
  let refreshes = 0;
  const unsubscribe = subscribeToToasts(() => { updates += 1; });
  try {
    api.defaults.adapter = async config => {
      if (config.url === '/auth/refresh') {
        refreshes += 1;
        return response(config, 204);
      }
      reject(config, config._retried ? 500 : 401, { message: 'internal SQL error' });
    };
    await assert.rejects(api.get('/protected'));
    assert.equal(refreshes, 1);
    assert.equal(updates, 1);
    assert.match(getToastSnapshot().message, /Something went wrong on our side/);
  } finally { unsubscribe(); }
});

test('automatic notifications sanitize route failures and ignore canceled requests', async () => {
  api.defaults.adapter = async config => reject(config, 404, { message: 'Cannot POST /api/auth/register' });
  await assert.rejects(api.post('/unknown'));
  assert.match(getToastSnapshot().message, /could not be found/);
  toast.dismiss();
  api.defaults.adapter = async config => { throw new AxiosError('canceled', 'ERR_CANCELED', config); };
  await assert.rejects(api.get('/canceled'));
  assert.equal(getToastSnapshot(), null);
});
