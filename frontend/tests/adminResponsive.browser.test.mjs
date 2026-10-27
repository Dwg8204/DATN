import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4186';
let server;
let browser;
before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4186', '--strictPort'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)), stdio: 'pipe',
  });
  let log = '';
  server.stdout.on('data', value => { log += value; });
  server.stderr.on('data', value => { log += value; });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { ready = (await fetch(origin)).ok; } catch { /* Server starting. */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, log);
  browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
});
after(async () => { await browser?.close(); server?.kill(); });

const metric = { value: 1234, changePercent: 12, changeLabel: '+12%', trend: [{ label: 'Oct', value: 1234 }] };
const routes = [
  '/admin/dashboard', '/admin/tests', '/admin/users', '/admin/notifications',
  ...['reading', 'listening', 'speaking', 'writing', 'grammar'].map(skill => `/admin/tests/new/${skill}?purpose=PRACTICE&mode=part1`),
  ...['reading', 'listening', 'speaking', 'writing', 'grammar'].map(skill => `/admin/tests/new/${skill}/part/1?purpose=PRACTICE&mode=part1`),
];

for (const language of ['en', 'vi']) {
  test(`sidebar test navigation works on mobile and keeps its desktop label on one line (${language})`, { timeout: 90_000 }, async () => {
    const context = await browser.newContext();
    await context.addInitScript(language => localStorage.setItem('aptimate-language', language), language);
    await context.route('**/*', route => {
      const url = route.request().url();
      return url.startsWith(origin) || url.includes('/api/v1/') ? route.continue() : route.abort();
    });
    await context.route('**/api/v1/**', route => {
      const path = new URL(route.request().url()).pathname;
      const json = path.endsWith('/profile/me') || path.endsWith('/auth/me')
        ? { id: 'sidebar-admin', role: 'ADMIN', firstName: 'QA', lastName: 'Admin', email: 'qa@example.com' }
        : { tests: [], total: 0 };
      return route.fulfill({ json, headers: { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true' } });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    page.setDefaultNavigationTimeout(30_000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const names = language === 'vi'
      ? { group: 'Quản lý đề', exam: 'Thi thử', practice: 'Luyện tập' }
      : { group: 'Test Management', exam: 'Mock tests', practice: 'Practice' };
    try {
      await page.goto(origin + '/admin/feedback');
      const toggle = page.getByRole('button', { name: names.group, exact: true });
      const assertIconsAligned = async () => {
        const offset = await toggle.evaluate(button => {
          const icon = button.querySelector('svg').getBoundingClientRect();
          const reference = button.closest('nav').querySelector('a > svg').getBoundingClientRect();
          return Math.abs((icon.left + icon.width / 2) - (reference.left + reference.width / 2));
        });
        assert.ok(offset < 1, 'Test Management icon aligns with the other sidebar icons');
      };
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        if (await toggle.getAttribute('aria-expanded') === 'true') await toggle.click();
        await toggle.click();
        const practice = page.getByRole('link', { name: names.practice, exact: true });
        const exam = page.getByRole('link', { name: names.exam, exact: true });
        await practice.waitFor();
        await exam.waitFor();
        assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
        if (width <= 900) await assertIconsAligned();
        if (width > 900) {
          const label = await toggle.locator('span').evaluate(element => {
            const range = document.createRange(); range.selectNodeContents(element);
            return { lines: range.getClientRects().length, width: element.clientWidth, textWidth: element.scrollWidth };
          });
          assert.equal(label.lines, 1, 'the full desktop label stays on one line');
          assert.ok(label.textWidth <= label.width, 'desktop label fits beside the icon and chevron');
        }
        const menu = page.locator(`[id="${await toggle.getAttribute('aria-controls')}"]`);
        const bounds = await menu.boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, 'submenu stays inside the viewport');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (process.env.ADMIN_LAYOUT_SCREENSHOT_DIR && [390, 1440].includes(width)) {
          await page.screenshot({ path: join(process.env.ADMIN_LAYOUT_SCREENSHOT_DIR, `sidebar-${language}-${width}.png`) });
        }
        await practice.click();
        await page.waitForURL('**/admin/tests?purpose=PRACTICE');
        if (width <= 900) assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
        assert.equal(await practice.getAttribute('aria-current'), 'page');
        await exam.click();
        await page.waitForURL('**/admin/tests?purpose=EXAM');
        if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
        assert.equal(await exam.getAttribute('aria-current'), 'page');
        await toggle.press('Escape');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        assert.equal(await toggle.evaluate(element => element === document.activeElement), true);
        await toggle.click();
        await page.locator('.adminTopbarTitle h1').click();
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false', 'clicking outside dismisses the submenu');
        // A collapsed sidebar on tablet/desktop must retain both test categories.
        if (width >= 768) {
          await page.locator('.adminMenuToggle').click();
          await assertIconsAligned();
          await toggle.click();
          await practice.click();
          await page.waitForURL('**/admin/tests?purpose=PRACTICE');
          assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
          await page.locator('.adminMenuToggle').click();
        }
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });
}

for (const language of ['en', 'vi']) {
  test(`admin pages fit the viewport with either sidebar state (${language})`, { timeout: 180_000 }, async () => {
    const context = await browser.newContext();
    await context.addInitScript(language => localStorage.setItem('aptimate-language', language), language);
    await context.route('**/*', route => {
      const url = route.request().url();
      return url.startsWith(origin) || url.includes('/api/v1/') ? route.continue() : route.abort();
    });
    await context.route('**/api/v1/**', route => {
      const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
      const headers = { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true',
        'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,OPTIONS' };
      let json = { tests: [], items: [], users: [], total: 0, pagination: { page: 1, pageSize: 5, total: 0, totalPages: 1 } };
      if (path === '/auth/me' || path === '/profile/me') json = { id: 'responsive-admin', role: 'ADMIN', firstName: 'QA', lastName: 'Admin', email: 'qa@example.com' };
      if (path === '/admin/dashboard') json = { generatedAt: '2026-10-14T00:00:00Z', metrics: { activeLearners: metric, newUsers: metric }, series: { testsCreated: [], testActivity: [] } };
      return route.fulfill({ json, headers });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    page.setDefaultNavigationTimeout(30_000);
    const errors = [];
    const failures = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    try {
      for (const path of routes) {
        console.log(`Checking ${language}: ${path}`);
        await page.goto(origin + path);
        await page.locator('.adminMenuToggle').waitFor({ state: 'attached' });
        await page.waitForLoadState('networkidle');
        for (const width of [320, 375, 390, 430, 600, 768, 1024, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          for (const collapsed of (path.includes('/part/') ? [false] : [false, true])) {
            if (collapsed) await page.locator('.adminMenuToggle').click();
            // Charts use ResizeObserver; allow their measured width to settle after resizing.
            await page.waitForTimeout(100);
            const result = await page.evaluate(() => {
              const viewport = document.documentElement.clientWidth;
              return { viewport, scrollWidth: document.documentElement.scrollWidth,
                offenders: [...document.querySelectorAll('body *')].filter(element => element.getBoundingClientRect().right > viewport + 1)
                  .filter(element => {
                    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
                      if (['auto', 'hidden', 'scroll', 'clip'].includes(getComputedStyle(parent).overflowX) && getComputedStyle(element).position !== 'absolute') return false;
                    }
                    return true;
                  }).slice(0, 15).map(element => `${element.tagName}.${element.className} (${getComputedStyle(element).position}, ${Math.round(element.getBoundingClientRect().width)}px, right ${Math.round(element.getBoundingClientRect().right)})`) };
            });
            if (result.scrollWidth > result.viewport + 1) failures.push({ path, width, collapsed, ...result });
            if (process.env.ADMIN_LAYOUT_SCREENSHOT_DIR && language === 'vi' && width === 390 && !collapsed && !path.includes('/tests/new/')) {
              await page.screenshot({ path: join(process.env.ADMIN_LAYOUT_SCREENSHOT_DIR, path.split('/').pop() + '.png'), fullPage: true });
            }
            if (collapsed) await page.locator('.adminMenuToggle').click();
          }
        }
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(failures, []);
    } finally { await context.close(); }
  });
}
