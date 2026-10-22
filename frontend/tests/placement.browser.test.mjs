import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4192';
let server, browser;
before(async () => {
  server = spawn(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      '--host',
      '127.0.0.1',
      '--port',
      '4192',
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
  'assessment card, target suggestion, preserved manual choice, mobile and completed history',
  { timeout: 120000 },
  async () => {
    let complete = false;
    const context = await browser.newContext({
      viewport: { width: 390, height: 900 },
    });
    await context.addInitScript(() =>
      localStorage.setItem('aptimate-language', 'en'),
    );
    const errors = [];
    await context.route('**/*', (route) =>
      route.request().url().startsWith(origin) ||
      route.request().url().includes('/api/v1/')
        ? route.continue()
        : route.abort(),
    );
    await context.route('**/api/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname.replace(
        '/api/v1',
        '',
      );
      const respond = (json) =>
        route.fulfill({
          json,
          headers: {
            'access-control-allow-origin': origin,
            'access-control-allow-credentials': 'true',
            'access-control-allow-methods':'GET,PUT,POST,OPTIONS',
            'access-control-allow-headers':'content-type',
          },
        });
      if (path === '/auth/me' || path === '/profile/me')
        return respond({
          id: 'student',
          role: 'STUDENT',
          firstName: 'Test',
          lastName: 'Learner',
          email: 'test@example.invalid',
        });
      if (path === '/me/ability-profile')
        return respond({
          bySkill: [
            'GRAMMAR_VOCAB',
            'READING',
            'LISTENING',
            'WRITING',
            'SPEAKING',
          ].map((skill) => ({
            skill,
            status: complete ? 'ESTIMATE' : 'NONE',
            band: complete ? 'B1' : null,
          })),
          overall: { band: 'A2' },
          suggestedTargetCefr: 'B1',
          placement: {
            required: ['GRAMMAR_VOCAB', 'READING', 'LISTENING'],
            missing: complete ? [] : ['GRAMMAR_VOCAB', 'READING', 'LISTENING'],
            complete,
            tests: [
              {
                skill: 'READING',
                testId: 'reading-placement',
                purpose: 'EXAM',
                title: 'Music',
              },
            ],
          },
        });
      if (path === '/me/learning-goal') return respond({ goal: null });
      if (path === '/me/learning-preferences')
        return respond({ reminderEnabled: false, reminderTime: '19:00' });
      if (path === '/me/study-plan/current')
        return respond({ plan: null, items: [] });
      if (path.includes('dashboard'))
        return respond({
          totalTests: 0,
          skillCounts: {},
          partCounts: {},
          scoreOverTime: [],
          skillDistribution: [],
        });
      if (path === '/chatbot/status')
        return respond({ data: { enabled: false } });
      if (path === '/me/insights/comment')
        return respond({ status: 'EMPTY', comment: null });
      return respond({
        data: [],
        items: [],
        count: 0,
        unreadCount: 0,
        pagination: { totalItems: 0 },
      });
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(60000);
    try {
      await page.goto(origin + '/profile/dashboard', {
        waitUntil: 'domcontentloaded',
      });
      const card = page.getByRole('heading', {
        name: 'Initial ability assessment',
      });
      await card.waitFor();
      assert.equal(await card.locator('..').getByRole('listitem').count(), 5);
      await page.goto(origin + '/profile', { waitUntil: 'domcontentloaded' });
      await page.getByLabel('Target band').waitFor();
      await page.waitForFunction(
        () => document.querySelector('select')?.value === 'B1',
      );
      assert.equal(await page.getByLabel('Target band').inputValue(), 'B1');
      await page.getByLabel('Target band').selectOption('C');
      assert.equal(await page.getByLabel('Target band').inputValue(), 'C');
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page.goto(origin + '/profile/dashboard', {
        waitUntil: 'domcontentloaded',
      });
      await page.getByRole('button', { name: 'Assess Reading' }).click();
      await page.waitForURL(
        '**/reading/introduction?testId=reading-placement&mode=full',
      );
      complete = true;
      await page.goto(origin + '/profile', { waitUntil: 'domcontentloaded' });
      await page.getByLabel('Target band').waitFor();
      await page.goto(origin + '/profile/dashboard', {
        waitUntil: 'domcontentloaded',
      });
      await page
        .getByRole('heading', { name: 'Initial ability assessment' })
        .waitFor({ state: 'hidden' });
      assert.equal(await card.count(), 0);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  },
);

test(
  'admin placement toggle persists on desktop/mobile; Part builders cannot enable it',
  { timeout: 120000 },
  async () => {
    let enabled = false,
      version = 1,
      writes = 0;
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    await context.addInitScript(() =>
      localStorage.setItem('aptimate-language', 'en'),
    );
    await context.route('**/*', (route) =>
      route.request().url().startsWith(origin) ||
      route.request().url().includes('/api/v1/')
        ? route.continue()
        : route.abort(),
    );
    await context.route('**/api/v1/**', (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname.replace('/api/v1', '');
      let json = {
        data: [],
        items: [],
        tests: [],
        total: 0,
        pagination: { totalItems: 0 },
      };
      if (path === '/auth/me' || path === '/profile/me')
        json = {
          id: 'admin',
          role: 'ADMIN',
          firstName: 'Test',
          lastName: 'Admin',
        };
      if (path === '/admin/placement-tests')
        json = { tests: [], missing: enabled ? [] : ['READING'] };
      if (path === '/reading-tests')
        json = {
          tests: [
            {
              id: 'reading-placement',
              name: 'Music',
              title: 'Music',
              dateAdded: '2026-10-22',
              mode: 'full',
              purpose: 'EXAM',
              component: 'Reading',
              status: 'PUBLISHED',
              version,
              isPlacement: enabled,
            },
          ],
          total: 1,
        };
      if (
        path === '/admin/tests/reading-placement/placement' &&
        req.method() === 'PUT'
      ) {
        assert.equal(req.postDataJSON().version, version);
        enabled = req.postDataJSON().isPlacement;
        version++;
        writes++;
        json = { id: 'reading-placement', version, isPlacement: enabled };
      }
      return route.fulfill({
        json,
        headers: {
          'access-control-allow-origin': origin,
          'access-control-allow-credentials': 'true',
            'access-control-allow-methods':'GET,PUT,POST,OPTIONS',
            'access-control-allow-headers':'content-type',
        },
      });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(60000);
    try {
      await page.goto(origin + '/admin/tests', {
        waitUntil: 'domcontentloaded',
      });
      await page
        .getByText('No published placement assessment: Reading', {
          exact: true,
        })
        .waitFor();
      const toggle = () =>
        page
          .getByRole('switch', { name: 'Placement assessment' })
          .filter({ visible: true });
      await toggle().click();
      await page.waitForFunction(
        () => document.querySelector('input[role=switch]')?.checked,
      );
      assert.equal(writes, 1);
      await page.setViewportSize({ width: 390, height: 900 });
      await toggle().click();
      await page.waitForFunction(()=>!document.querySelector('input[role=switch]')?.checked);
      assert.equal(writes, 2);
      for (const skill of [
        'reading',
        'grammar',
        'listening',
        'writing',
        'speaking',
      ]) {
        await page.goto(
          origin + '/admin/tests/new/' + skill + '?purpose=PRACTICE&mode=part1',
          { waitUntil: 'domcontentloaded' },
        );
        await page
          .getByRole('switch', { name: 'Placement assessment' })
          .waitFor();
        assert.equal(
          await page
            .getByRole('switch', { name: 'Placement assessment' })
            .isDisabled(),
          true,
        );
      }
      assert.deepEqual(errors, []);
    } catch (error) {
      console.error(
        'UI state',
        page.url(),
        await page.locator('body').innerText(),
        errors,
      );
      throw error;
    } finally {
      await context.close();
    }
  },
);
