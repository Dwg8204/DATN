import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4191';
let server, browser;
before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4191', '--strictPort'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)), stdio: 'pipe',
  });
  let log = '';
  server.stdout.on('data', chunk => { log += chunk; });
  server.stderr.on('data', chunk => { log += chunk; });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { ready = (await fetch(origin)).ok; } catch { /* starting */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, log);
  browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
});
after(async () => { await browser?.close(); server?.kill(); });

async function session(role, language = 'en') {
  const context = await browser.newContext();
  await context.addInitScript(language => localStorage.setItem('aptimate-language', language), language);
  const calls = [];
  await context.route('**/*', route => route.request().url().startsWith(origin) || route.request().url().includes('/api/v1/')
    ? route.continue() : route.abort());
  await context.route('**/api/v1/**', route => {
    const url = new URL(route.request().url());
    calls.push(url.pathname);
    const user = { id: 'role-fixture', role, firstName: 'Role', lastName: 'Fixture', email: 'role@example.invalid', status: 'ACTIVE' };
    const json = /\/(auth|profile)\/me$/.test(url.pathname) ? user
      : url.pathname.endsWith('/admin/users') ? {
        data: [{ ...user, role: url.searchParams.get('role') || 'STUDENT', fullName: 'Role Fixture' }],
        pagination: { page: 1, pageSize: 5, totalItems: 1, totalPages: 1 },
      } : { data: [], pagination: { page: 1, totalItems: 0, totalPages: 0 }, tests: [], total: 0 };
    return route.fulfill({ json, headers: { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true' } });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(60_000);
  return { context, page, calls };
}

for (const language of ['en', 'vi']) test(`account management and notification options use two roles (${language})`, { timeout: 90_000 }, async () => {
  const { context, page } = await session('ADMIN', language);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${origin}/admin/users?role=STUDENT`);
      const tabs = page.getByRole('navigation', { name: language === 'vi' ? 'Loại tài khoản' : 'Account type' });
      await tabs.waitFor();
      assert.equal(await tabs.getByRole('button').count(), 2);
      if (width === 390) {
        const columns = await tabs.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
        assert.equal(columns, 2, 'mobile tabs fill two columns without a retired-role gap');
      }
      await page.locator('small:visible').filter({ hasText: 'role@example.invalid' }).first().waitFor();
      assert.equal(await page.getByRole('button', { name: /teacher|giáo viên|promot/i }).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await page.goto(`${origin}/admin/notifications`);
    await page.getByRole('button', { name: language === 'vi' ? 'Nhóm người nhận' : 'Target audience', exact: true }).click();
    assert.equal(await page.getByRole('option').count(), 2);
    assert.equal(await page.getByRole('option', { name: /teacher|giáo viên/i }).count(), 0);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

for (const role of ['STUDENT', 'TEACHER']) test(`${role} cannot open admin management routes`, { timeout: 60_000 }, async () => {
  const { context, page, calls } = await session(role);
  try {
    for (const path of ['/admin/users', '/admin/tests']) {
      await page.goto(origin + path);
      await page.waitForURL(origin + '/');
    }
    assert.equal(calls.some(path => path.includes('/admin/')), false);
  } finally { await context.close(); }
});
