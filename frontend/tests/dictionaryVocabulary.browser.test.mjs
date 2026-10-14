import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const { chromium } = process.env.DICTIONARY_PLAYWRIGHT
  ? createRequire(import.meta.url)(process.env.DICTIONARY_PLAYWRIGHT) : await import('playwright');
const origin = 'http://localhost:5299';
const folderId = '11111111-1111-4111-8111-111111111111';
const createdId = '22222222-2222-4222-8222-222222222222';
const fixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from './src/context/AuthContext.jsx';
import DictionaryPopover from './src/features/practice/components/DictionaryPopover.jsx';
function App() { const {user} = useAuth(); return <>
 <p style={{margin:'40px'}}><span id='word'>correct</span></p>
 {user && <span data-testid='authenticated'/>}<DictionaryPopover active/>
</> }
createRoot(document.getElementById('root')).render(<AuthProvider><App/></AuthProvider>);`;

test('dictionary uses real notebook API contracts for folders, word saving, safe retries and reload', async () => {
  const bundle = await build({ stdin: { contents: fixture, resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx' },
    bundle: true, write: false, outfile: 'dictionary.js', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': JSON.stringify({ VITE_API_BASE_URL: `${origin}/api/v1` }) } });
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  const topics = [{ id: folderId, name: 'hello' }], words = [], posts = [], folderPosts = [], errors = [];
  let failNext = true, failFolders = false, noMeaning = false;
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const path = new URL(route.request().url()).pathname;
      const respond = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (path === '/') return route.fulfill({ contentType: 'text/html', body: '<html><body><div id="root"></div></body></html>' });
      if (path === '/api/v1/profile/me') return respond({ id: 'user-a', firstName: 'Test', role: 'STUDENT' });
      if (path === '/api/v1/dictionary/correct') return respond({ entries: [{ phonetic: '/kəˈrekt/', meanings: [] }],
        translations: noMeaning ? [] : [{ partOfSpeech: 'adjective', terms: ['đúng', '正确'] }], examples: ['Your answer is correct.'] });
      if (path === '/api/v1/vocabulary/study') return respond(failFolders ? { message: 'Unavailable' } : { topics, words, exercises: [], ratings: {}, progress: {} }, failFolders ? 503 : 200);
      if (path === '/api/v1/vocabulary/folders') {
        const dto = route.request().postDataJSON(); folderPosts.push(dto);
        const folder = topics.find(item => item.name === dto.name) ?? { id: dto.name === 'My vocabulary' ? '33333333-3333-4333-8333-333333333333' : createdId, name: dto.name };
        if (!topics.includes(folder)) topics.push(folder);
        return respond({ data: folder }, 201);
      }
      if (path === '/api/v1/vocabulary/study/items') {
        const dto = route.request().postDataJSON(); posts.push(dto);
        if (!words.some(item => item.clientRequestId === dto.clientRequestId)) words.push({ ...dto, id: 'saved-word' });
        if (failNext) { failNext = false; return respond({ message: 'Temporary failure' }, 503); }
        return respond({ id: 'saved-word' }, 201);
      }
      return route.abort();
    });
    const mount = async () => {
      await page.goto(origin);
      await page.addStyleTag({ content: bundle.outputFiles.find(file => file.path.endsWith('.css')).text });
      await page.addScriptTag({ content: bundle.outputFiles.find(file => file.path.endsWith('.js')).text });
      await page.getByTestId('authenticated').waitFor({ state: 'attached' });
      await page.locator('#word').dblclick();
      await page.getByText(noMeaning ? 'No Vietnamese meaning is available.' : 'đúng', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Add to my vocabulary list' }).click();
    };
    await mount();
    assert.equal(await page.getByText('正确', { exact: true }).count(), 0, 'display and saved meaning both exclude non-Vietnamese scripts');
    const hello = page.getByRole('button', { name: 'hello', exact: true });
    await hello.waitFor();
    assert.equal(await page.getByRole('button', { name: 'test', exact: true }).count(), 0, 'no fake folders');
    await hello.click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByText('Word saved to your Vocabulary Notebook.').count(), 0, 'never show success on a failed response');
    await hello.click();
    await page.getByText('Word saved to your Vocabulary Notebook.').waitFor();
    assert.equal(await hello.isDisabled(), true);
    assert.equal(posts.length, 2);
    assert.deepEqual(posts[0], posts[1], 'retry uses the same idempotency UUID and metadata');
    assert.match(posts[0].clientRequestId, /^[0-9a-f-]{36}$/);
    assert.deepEqual({ ...posts[0], clientRequestId: undefined }, {
      folderId, clientRequestId: undefined, kind: 'WORD', word: 'correct', meaning: 'đúng',
      pronunciation: '/kəˈrekt/', type: 'adjective', example: 'Your answer is correct.' });
    await page.getByLabel('List name…').fill('New list');
    await page.getByRole('button', { name: 'Create vocabulary list' }).click();
    await page.getByRole('button', { name: 'New list', exact: true }).waitFor();
    assert.deepEqual(folderPosts[0], { name: 'New list' });
    await page.getByRole('button', { name: 'New list', exact: true }).click();
    await page.getByText('Word saved to your Vocabulary Notebook.').waitFor();
    assert.equal(words.length, 2);
    await mount();
    await hello.waitFor(); assert.equal(await hello.isDisabled(), true, 'reload reads the saved word from the API');
    assert.equal(await page.getByRole('button', { name: 'New list', exact: true }).isDisabled(), true);
    const beforeDefault = posts.length;
    await page.getByRole('button', { name: 'My vocabulary', exact: true }).click();
    await page.getByText('Word saved to your Vocabulary Notebook.').waitFor();
    assert.equal(folderPosts.at(-1).name, 'My vocabulary');
    assert.equal(posts.length, beforeDefault + 1, 'default list is persisted and saves the word');

    for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      const layout = await page.getByRole('dialog').evaluate(element => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
          overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.ok(layout.left >= 0 && layout.right <= viewport.width && layout.top >= 0 && layout.bottom <= viewport.height);
      assert.equal(layout.overflow, false);
      if (process.env.DICTIONARY_SCREENSHOTS) await page.screenshot({ path: `${process.env.DICTIONARY_SCREENSHOTS}/dictionary-vocabulary-${viewport.width}.png` });
    }

    failFolders = true;
    await mount(); await page.getByRole('button', { name: 'Load lists again' }).waitFor();
    failFolders = false;
    await page.getByRole('button', { name: 'Load lists again' }).click(); await hello.waitFor();

    // Remount clears the lookup cache; no Vietnamese meaning means no save.
    noMeaning = true;
    await mount(); await hello.waitFor();
    assert.equal(await page.getByRole('button', { name: 'My vocabulary', exact: true }).isDisabled(), true);
    await page.getByText('A Vietnamese meaning is required to save this word. Try looking it up again.').waitFor();
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
