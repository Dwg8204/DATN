import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4193';
let server, browser;
before(async () => {
  server = spawn(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      '--host',
      '127.0.0.1',
      '--port',
      '4193',
      '--strictPort',
    ],
    { stdio: 'ignore' },
  );
  let ready = false;
  for (let i = 0; i < 600; i++) {
    try {
      ready = (await fetch(origin)).ok;
    } catch {}
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'Vite did not start');
  browser = await chromium.launch({
    headless: true,
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
  });
});
after(async () => {
  await browser?.close();
  server?.kill();
});

test(
  'Dashboard shares one overview, syncs only when needed and polls overview',
  { timeout: 120000 },
  async () => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 900 },
    });
    await context.addInitScript(() =>
      localStorage.setItem('aptimate-language', 'en'),
    );
    let needed = false,
      pending = false, commentStatus = 'READY';
    const calls = [];
    await context.route('**/*', (route) =>
      route.request().url().startsWith(origin) ||
      route.request().url().includes('/api/v1/')
        ? route.continue()
        : route.abort(),
    );
    await context.route('**/api/v1/**', (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname.replace('/api/v1', '');
      if (req.method() !== 'OPTIONS' && path.startsWith('/me/'))
        calls.push(path);
      let json = { items: [], data: [], count: 0, unreadCount: 0 };
      if (path === '/auth/me' || path === '/profile/me')
        json = {
          id: 'student',
          role: 'STUDENT',
          firstName: 'Test',
          lastName: 'Learner',
        };
      if (path === '/me/personalization/sync') {
        needed = false;
        json = { synced: true };
      }
      if (path === '/me/personalization/overview')
        json = {
          goal: null,
          progress: null,
          profile: { bySkill: [], placement: { complete: true } },
          plan: null,
          today: '2026-10-23',
          comment: commentStatus !== 'READY' ? {status: commentStatus, comment: null, nextRetryAt: '2026-10-23T12:00:00Z'} : pending
            ? { status: 'PENDING', comment: null }
            : {
                status: 'READY',
                comment: {
                  content: {
                    summary: 'Your progress is ready.',
                    strengths: [],
                    focus: [],
                  },
                },
              },
          recentReports: [],
          needsSync: needed,
        };
      if (path.includes('dashboard'))
        json = {
          totalTests: 0,
          skillCounts: {},
          partCounts: {},
          scoreOverTime: [],
          skillDistribution: [],
        };
      return route.fulfill({
        json,
        headers: {
          'access-control-allow-origin': origin,
          'access-control-allow-credentials': 'true',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': 'content-type',
        },
      });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(60000);
    try {
      await page.goto(origin + '/profile/dashboard', {
        waitUntil: 'domcontentloaded',
      });
      await page.getByText('Your progress is ready.').waitFor();
      assert.deepEqual(calls, ['/me/personalization/overview']);
      needed = true;
      calls.length = 0;
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByText('Your progress is ready.').waitFor();
      assert.deepEqual(calls, [
        '/me/personalization/overview',
        '/me/personalization/sync',
        '/me/personalization/overview',
      ]);
      pending = true;
      calls.length = 0;
      await page.clock.install();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page
        .getByText(
          'Preparing your feedback… Your progress and study plan are ready below.',
        )
        .waitFor();
      pending = false;
      await page.clock.runFor(16000);
      await page.getByText('Your progress is ready.').waitFor();
      assert.deepEqual(calls, [
        '/me/personalization/overview',
        '/me/personalization/overview',
      ]);
      // FAILED is exposed as RETRYING by the API. Keep the mounted Dashboard alive through recovery.
      commentStatus = 'RETRYING';
      calls.length = 0;
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByText('Retrying your feedback. It will appear automatically when ready.').waitFor();
      for (const delay of [15000, 30000, 60000]) {
        const count = calls.length;
        await page.clock.runFor(delay - 1000);
        assert.equal(calls.length, count);
        const response = page.waitForResponse(r => r.url().includes('/me/personalization/overview'));
        await page.clock.runFor(1000);
        await response;
        await page.waitForTimeout(10);
        assert.equal(calls.length, count + 1);
      }
      commentStatus = 'READY';
      await page.clock.runFor(60000);
      await page.getByText('Your progress is ready.').waitFor();
      const readyCalls = calls.length;
      await page.clock.runFor(120000);
      assert.equal(calls.length, readyCalls, 'READY stops polling');
      for (const status of ['FALLBACK', 'HIDDEN']) {
        commentStatus = status;
        const response = page.waitForResponse(r => r.url().includes('/me/personalization/overview'));
        await page.reload({ waitUntil: 'domcontentloaded' });
        await response;
        await page.waitForTimeout(10);
        const count = calls.length;
        await page.clock.runFor(120000);
        assert.equal(calls.length, count, status + ' stops polling');
      }
      assert.ok(calls.every(path => path === '/me/personalization/overview'));
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  },
);
