import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

test('Learning History preserves API filters/review, nullable scores, themes and mobile layout', async () => {
  const bundle = await build({
    stdin: { resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx', contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import {MemoryRouter} from 'react-router-dom';
      import i18n from './src/i18n/index.js';
      import LearningHistory from './src/features/profile/pages/LearningHistoryPage.jsx';
      window.historyCalls=[]; window.changeLanguage=l=>i18n.changeLanguage(l);
      i18n.changeLanguage('en');
      createRoot(document.getElementById('root')).render(<MemoryRouter><LearningHistory/></MemoryRouter>);
    ` },
    bundle: true, write: false, outfile: 'history.js', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{
      name: 'history-fixtures',
      setup(build) {
        build.onLoad({ filter: /AuthContext\.jsx$/ }, () => ({ loader: 'js', contents: "export const useAuth=()=>({user:{fullName:'AptiMate learner',email:'learner@example.test'},logout:async()=>{}})" }));
        build.onLoad({ filter: /(?:testAttemptsApi|practiceAttemptsApi)\.js$/ }, ({ path }) => {
          const practice = path.includes('practiceAttemptsApi');
          return { loader: 'js', contents: `
            export const ${practice ? 'practiceAttemptsApi' : 'testAttemptsApi'} = {
              async history(params) {
                window.historyCalls.push({purpose:'${practice ? 'PRACTICE' : 'EXAM'}',...params});
                if (window.failHistory && params.pageSize!==1) throw new Error('Fixture failure');
                const base={purpose:'${practice ? 'PRACTICE' : 'EXAM'}', scope:'${practice ? 'PART' : 'FULL_SKILL'}',
                  partNumber:2, startedAt:'2026-10-22T01:00:00Z',submittedAt:'2026-10-22T01:20:00Z'};
                return {data:window.emptyHistory?[]:[
                  {...base,attemptId:'speaking-1',component:'SPEAKING',title:'Speaking sample',score:0,maxScore:50,estimatedCefr:'A1'},
                  {...base,attemptId:'writing-1',component:'WRITING',title:'Writing sample',score:null,maxScore:50,gradingStatus:'PROCESSING'}
                ],pagination:{totalItems:window.emptyHistory?0:${practice ? 7 : 23}}};
              }
            };
          ` };
        });
      },
    }],
  });
  const css = await readFile(new URL('../src/assets/styles/global.css', import.meta.url), 'utf8');
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  try {
    for (const width of [1440, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 1100 } });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<html data-theme="light"><body><div id="root"></div></body></html>' }));
      await page.goto('http://history.test/');
      await page.addStyleTag({ content: css + bundle.outputFiles.find(f => f.path.endsWith('.css')).text });
      await page.addScriptTag({ content: bundle.outputFiles.find(f => f.path.endsWith('.js')).text });
      await page.getByRole('link', { name: 'Review result: Speaking sample' }).waitFor();
      assert.equal(await page.locator('thead th').count(), 6);
      assert.equal(await page.locator('tbody tr').count(), 2);
      assert.equal(await page.locator('[class*="_statCard"] strong').allTextContents().then(values => values.join(',')), '23,7');
      assert.match(await page.locator('tbody tr').first().textContent(), /0 \/ 50/);
      assert.equal(await page.locator('tbody tr').nth(1).locator('td').nth(3).locator('strong').textContent(), '—');
      assert.equal(await page.getByRole('link', { name: 'Review result: Speaking sample' }).getAttribute('href'), '/speaking/result?attemptId=speaking-1');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (process.env.HISTORY_SCREENSHOTS) {
        await mkdir(process.env.HISTORY_SCREENSHOTS, { recursive: true });
        await page.screenshot({ path: join(process.env.HISTORY_SCREENSHOTS, 'history-light-' + width + '.png'), fullPage: true });
      }
      await page.getByRole('button', { name: 'Next page', exact: true }).click();
      await page.waitForFunction(() => window.historyCalls.some(c => c.page===2));
      await page.getByRole('button', { name: 'Practice', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('tbody a')?.getAttribute('href').includes('practice=true'));
      assert.equal(await page.getByRole('link', { name: 'Review result: Speaking sample' }).getAttribute('href'), '/speaking/detail-result?attemptId=speaking-1&practice=true');
      await page.getByRole('button', { name: 'Grammar & Vocabulary', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Part 3', exact: true }).count(), 0);
      await page.getByRole('button', { name: 'Part 2', exact: true }).click();
      await page.getByRole('textbox', { name: 'Search by test name' }).fill('sample');
      await page.getByRole('textbox', { name: 'Search by test name' }).press('Enter');
      await page.waitForFunction(() => window.historyCalls.some(c => c.search==='sample' && c.mode==='part2' && c.component==='GRAMMAR_VOCAB'));
      await page.getByRole('button', { name: 'Sort test history' }).click();
      await page.getByRole('option', { name: 'Oldest' }).click();
      await page.waitForFunction(() => window.historyCalls.some(c => c.sort==='asc' && c.search==='sample'));
      await page.evaluate(() => { document.documentElement.dataset.theme='dark'; return window.changeLanguage('vi'); });
      await page.getByRole('heading', { name: 'Lịch sử học tập', exact: true }).waitFor();
      const colors = await page.locator('tbody td').first().evaluate(el => ({ text:getComputedStyle(el).color, surface:getComputedStyle(el.closest('section')).backgroundColor }));
      assert.equal(colors.text, 'rgb(248, 250, 252)');
      assert.equal(colors.surface, 'rgb(15, 23, 42)');
      await page.waitForFunction(() => getComputedStyle(document.querySelector('button[aria-haspopup="listbox"]')).backgroundColor === 'rgb(15, 23, 42)');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (process.env.HISTORY_SCREENSHOTS) await page.screenshot({ path: join(process.env.HISTORY_SCREENSHOTS, 'history-dark-' + width + '.png'), fullPage: true });
      await page.evaluate(() => window.changeLanguage('en'));
      await page.evaluate(() => { window.emptyHistory=true; });
      await page.getByRole('button', { name: 'All', exact: true }).click();
      await page.getByText("You haven't completed any activities matching these filters yet.", { exact: true }).waitFor();
      assert.equal(await page.locator('tbody tr').count(), 0);
      await page.evaluate(() => { window.emptyHistory=false; window.failHistory=true; });
      await page.getByRole('button', { name: 'Reading', exact: true }).click();
      await page.getByRole('heading', { name: 'Unable to load history', exact: true }).waitFor();
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
});
