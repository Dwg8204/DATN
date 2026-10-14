import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const { chromium } = process.env.DICTIONARY_PLAYWRIGHT
  ? createRequire(import.meta.url)(process.env.DICTIONARY_PLAYWRIGHT) : await import('playwright');
const origin = 'http://localhost:5299';
const fixture = `
import './src/i18n/index.js';
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import VocabularyWordInput from './src/features/dictation/components/VocabularyWordInput.jsx';
import styles from './src/features/dictation/pages/DictationPage.module.css';
function App(){const[item,setItem]=useState({word:'ball',meaning:'',pronunciation:'',example:'',type:'noun'});
return <form className={styles.createModal} onSubmit={e=>e.preventDefault()}>
<VocabularyWordInput item={item} knownWords={[]} onChange={word=>setItem(previous=>({...previous,word}))}
 onResolved={(word,fields)=>setItem(previous=>previous.word===word?{...previous,...fields}:previous)}/>
<label htmlFor='pronunciation'>Pronunciation</label><input id='pronunciation' value={item.pronunciation} readOnly/>
<label htmlFor='meaning'>Vietnamese meaning</label><textarea id='meaning' value={item.meaning} readOnly/>
</form>}createRoot(document.getElementById('root')).render(<App/>);`;

const notebookFixture = `
import React from 'react';import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {AuthProvider} from './src/context/AuthContext.jsx';
import DictationPage from './src/features/dictation/pages/DictationPage.jsx';
createRoot(document.getElementById('root')).render(<AuthProvider>
<MemoryRouter initialEntries={['/dictation?mode=notebook']}><DictationPage/></MemoryRouter>
</AuthProvider>);`;

test('real Notebook form locks Word type after suggestion selection and unlocks after editing or failed lookup', async () => {
  const bundle = await build({ stdin: { contents: notebookFixture, resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx' },
    bundle: true, write: false, outfile: 'notebook-type.js', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': JSON.stringify({ VITE_API_BASE_URL: `${origin}/api/v1` }) } });
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      const json = data => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
      if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<html><head><style>body{margin:0;font-family:Arial}*{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>' });
      if (url.pathname === '/api/v1/profile/me') return json({ id: 'user-a', firstName: 'Test', role: 'STUDENT' });
      if (url.pathname === '/api/v1/vocabulary/study') return json({ topics: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Daily life' }],
        words: [{ id: 'make', word: 'make', type: 'verb', meaning: 'làm', pronunciation: '/meɪk/', example: 'I make progress.', topic: 'Daily life' }], exercises: [], progress: {}, ratings: {} });
      if (url.pathname === '/api/v1/dictionary/suggestions') return json({ words: ['under','unknown'].filter(word => word.startsWith(url.searchParams.get('q'))) });
      if (url.pathname === '/api/v1/dictionary/under') return json({ translations: [{ partOfSpeech: 'preposition', terms: ['dưới'] }], entries: [{ phonetic: '/ˈʌndə/' }], examples: ['The cat is under the table.'] });
      if (url.pathname === '/api/v1/dictionary/unknown') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Unavailable' }) });
      return route.abort();
    });
    await page.goto(origin);
    await page.addStyleTag({ content: bundle.outputFiles.find(file => file.path.endsWith('.css')).text });
    await page.addScriptTag({ content: bundle.outputFiles.find(file => file.path.endsWith('.js')).text });
    await page.getByRole('button', { name: 'Add new', exact: true }).click();
    const input = page.getByRole('combobox'), type = page.getByRole('button', { name: 'Word type', exact: true });
    assert.equal(await type.isDisabled(), false);
    await input.fill('ma');
    await page.getByRole('option').filter({ hasText: 'make' }).getByRole('button').click();
    assert.equal(await type.isDisabled(), true); assert.equal(await type.textContent(), 'verb');
    await page.getByRole('button', { name: 'Word', exact: true }).click();
    assert.equal(await type.isDisabled(), true, 'clicking the selected tab cannot reset a dictionary-owned type');
    await input.fill('manual'); assert.equal(await type.isDisabled(), false);
    await type.click(); await page.getByRole('option', { name: 'adjective', exact: true }).click();
    assert.equal(await type.textContent(), 'adjective');
    await input.fill('und');
    await page.getByRole('option').filter({ hasText: 'under' }).getByRole('button').click();
    await page.getByRole('status').filter({ hasText: 'Dictionary details filled in.' }).waitFor();
    assert.equal(await type.isDisabled(), true); assert.equal(await type.textContent(), 'preposition');
    await input.fill('unk');
    await page.getByRole('option').filter({ hasText: 'unknown' }).getByRole('button').click();
    await page.getByRole('status').filter({ hasText: 'Unable to retrieve this word.' }).waitFor();
    assert.equal(await type.isDisabled(), false);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Add new', exact: true }).click();
    assert.equal(await type.isDisabled(), false, 'a new form never inherits the previous lock');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('notebook word lookup visibly loads, then clears on success/error, in light and dark mobile layouts', async () => {
  const bundle = await build({ stdin: { contents: fixture, resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx' },
    bundle: true, write: false, outfile: 'word-lookup.js', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': JSON.stringify({ VITE_API_BASE_URL: `${origin}/api/v1` }) } });
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  try {
    for (const theme of ['light', 'dark']) {
      const viewport = theme === 'dark' ? { width: 390, height: 844 } : { width: 1280, height: 720 };
      const page = await browser.newPage({ viewport });
      const errors = [], pending = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/') return route.fulfill({ contentType: 'text/html', body: `<html data-theme="${theme}"><head><style>*{box-sizing:border-box}body{margin:0;padding:16px;font-family:Arial;--bg-surface:#0f172a;--bg-hover:#1e293b;--text-primary:#e2e8f0;--text-muted:#cbd5e1;--border:#475569}</style></head><body><div id="root"></div></body></html>` });
        if (path === '/api/v1/dictionary/suggestions') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ words: [] }) });
        if (path.startsWith('/api/v1/dictionary/')) { pending.push(route); return undefined; }
        return route.abort();
      });
      await page.goto(origin);
      await page.addStyleTag({ content: bundle.outputFiles.find(file => file.path.endsWith('.css')).text });
      await page.addScriptTag({ content: bundle.outputFiles.find(file => file.path.endsWith('.js')).text });
      await page.getByRole('button', { name: 'Look up this word', exact: true }).click();
      const status = page.getByRole('status');
      await status.filter({ hasText: 'Looking up meaning, pronunciation and an example sentence…' }).waitFor();
      const busy = page.getByRole('button', { name: 'Looking up meaning, pronunciation and an example sentence…', exact: true });
      assert.equal(await busy.isDisabled(), true);
      assert.equal(await busy.getAttribute('aria-busy'), 'true');
      assert.equal(await page.locator('svg[class*="spinner"]').count(), 2);
      const layout = await status.evaluate(element => {
        const rect = element.getBoundingClientRect(), css = getComputedStyle(element);
        const spinner = element.querySelector('svg');
        return { visible: rect.height > 0, right: rect.right, color: css.color,
          background: css.backgroundColor, animation: getComputedStyle(spinner).animationName,
          overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.ok(layout.visible && layout.right <= viewport.width);
      assert.equal(layout.overflow, false); assert.notEqual(layout.color, layout.background);
      assert.match(layout.animation, /wordLookupSpin/);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await status.locator('svg').evaluate(element => getComputedStyle(element).animationName), 'none');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      if (process.env.DICTIONARY_SCREENSHOTS) await page.screenshot({ path: `${process.env.DICTIONARY_SCREENSHOTS}/notebook-word-loading-${theme}.png` });
      assert.equal(pending.length, 1);
      await pending[0].fulfill({ contentType: 'application/json', body: JSON.stringify({ entries: [{ phonetic: '/bɔːl/' }],
        translations: [{ partOfSpeech: 'noun', terms: ['quả bóng'] }], examples: ['He threw the ball.'] }) });
      await status.filter({ hasText: 'Dictionary details filled in.' }).waitFor();
      assert.equal(await page.locator('svg[class*="spinner"]').count(), 0);
      assert.equal(await page.getByLabel('Vietnamese meaning').inputValue(), 'quả bóng');
      await page.getByRole('button', { name: 'Look up this word', exact: true }).click();
      assert.equal(pending.length, 1, 'cached words do not start an unnecessary request');
      await page.getByRole('combobox').fill('high');
      await page.getByRole('button', { name: 'Look up this word', exact: true }).click();
      await status.filter({ hasText: 'Looking up meaning' }).waitFor();
      await page.waitForFunction(() => document.querySelector('button[aria-busy="true"]'));
      assert.equal(pending.length, 2);
      await pending[1].fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Unavailable' }) });
      await status.filter({ hasText: 'Unable to retrieve this word.' }).waitFor();
      assert.equal(await page.locator('svg[class*="spinner"]').count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Look up this word', exact: true }).isDisabled(), false);
      assert.deepEqual(errors, []); await page.close();
    }
  } finally { await browser.close(); }
});
