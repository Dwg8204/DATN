import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

test('comments persist, isolate skills and flatten replies with correct mentions', async () => {
  const bundle = await build({ stdin: { resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx', contents: `
import React,{useState} from 'react'; import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';
import i18n from './src/i18n/index.js';import CommentSection from './src/components/shared/CommentSection/CommentSection.jsx';
i18n.changeLanguage('en'); window.commentUser={id:'alice'};
function App(){const [skill,setSkill]=useState('writing'); const [session,setSession]=useState(0);
window.setCommentSkill=setSkill;window.refreshCommentSession=()=>setSession(x=>x+1);
return <MemoryRouter><CommentSection key={session} skill={skill}/></MemoryRouter>};createRoot(document.getElementById('root')).render(<App/>);` },
    plugins: [{ name: 'auth-fixture', setup(builder) { builder.onLoad({ filter: /[\\/]context[\\/]AuthContext.jsx$/ }, () => ({ contents: 'export const useAuth=()=>({user:window.commentUser,isAuthReady:true});', loader: 'js' })); } }],
    bundle: true, write: false, outfile: 'comments.js', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' },
  });
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 850 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const base = { skill: 'writing', avatar: null, role: 'STUDENT', createdAt: '2026-10-14T10:00:00Z', deletedAt: null };
    const root = { ...base, id: 'root', parentId: null, authorId: 'bob', author: 'Bob', content: 'Writing discussion', mention: null, replies: [
      { ...base, id: 'reply', parentId: 'root', authorId: 'carol', author: 'Carol', content: 'Carol reply', mention: 'Bob' },
    ] };
    const discussions = { writing: [root], reading: [] };
    const posts = []; let failNext = false; let delayWriting = false;
    await page.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.hostname === 'comments-ui.test') return route.fulfill({ contentType: 'text/html', body: '<html><body><div id="root"></div></body></html>' });
      if (url.pathname === '/api/v1/comments' && request.method() === 'GET') {
        const skill = url.searchParams.get('skill');
        const list = structuredClone(discussions[skill] ?? []);
        if (skill === 'writing' && delayWriting) await new Promise(resolve => setTimeout(resolve, 200));
        return route.fulfill({ json: { data: { comments: list, total: list.reduce((n, c) => n + 1 + c.replies.length, 0), hasMore: false } } });
      }
      if (url.pathname === '/api/v1/comments' && request.method() === 'POST') {
        const body = request.postDataJSON(); posts.push(body);
        if (failNext) { failNext = false; return route.fulfill({ status: 500, json: { error: { code: 'DATABASE_ERROR' } } }); }
        const list = discussions[body.skill];
        const parent = list.find(c => c.id === body.replyToId || c.replies.some(r => r.id === body.replyToId));
        const target = parent && (parent.id === body.replyToId ? parent : parent.replies.find(r => r.id === body.replyToId));
        const comment = { ...base, skill: body.skill, id: `new-${posts.length}`, parentId: parent?.id ?? null, authorId: 'alice', author: 'Alice',
          content: body.content, mention: target && target.authorId !== 'alice' ? target.author : null, replies: [] };
        if (parent) parent.replies.push(comment); else list.unshift(comment);
        return route.fulfill({ json: { data: comment } });
      }
      if (url.pathname.startsWith('/api/v1/comments/') && request.method() === 'DELETE') {
        const id = url.pathname.split('/').at(-1), skill = url.searchParams.get('skill');
        const comment = discussions[skill].flatMap(c => [c, ...c.replies]).find(c => c.id === id);
        comment.deletedAt = new Date().toISOString(); comment.content = '';
        return route.fulfill({ json: { data: { id } } });
      }
      return route.abort();
    });
    await page.goto('http://comments-ui.test/');
    await page.addStyleTag({ content: bundle.outputFiles.find(f => f.path.endsWith('.css')).text });
    await page.addScriptTag({ content: bundle.outputFiles.find(f => f.path.endsWith('.js')).text });
    await page.getByText('Writing discussion', { exact: true }).waitFor();
    await page.locator('article').filter({ hasText: 'Carol reply' }).getByRole('button', { name: 'Reply', exact: true }).click();
    await page.getByLabel('Write a reply…').fill('Answering Carol');
    await page.getByLabel('Write a reply…').locator('xpath=ancestor::form').getByRole('button', { name: 'Send', exact: true }).click();
    await page.locator('article').filter({ hasText: 'Answering Carol' }).waitFor();
    assert.equal(posts[0].replyToId, 'reply');
    assert.match(await page.locator('article').filter({ hasText: 'Answering Carol' }).innerText(), /@Carol/);
    assert.equal(await page.locator('article article').count(), 0, 'no recursive article nesting');
    await page.locator('article').filter({ hasText: 'Answering Carol' }).getByRole('button', { name: 'Reply', exact: true }).click();
    assert.equal(await page.getByText('@Alice', { exact: true }).count(), 0);
    await page.getByLabel('Write a reply…').fill('Continuing my reply');
    await page.getByLabel('Write a reply…').locator('xpath=ancestor::form').getByRole('button', { name: 'Send', exact: true }).click();
    await page.locator('article').filter({ hasText: 'Continuing my reply' }).waitFor();
    assert.doesNotMatch(await page.locator('article').filter({ hasText: 'Continuing my reply' }).innerText(), /@Alice/);
    failNext = true;
    await page.getByLabel('Write a comment…').fill('Keep draft after failure');
    await page.getByLabel('Write a comment…').locator('xpath=ancestor::form').getByRole('button', { name: 'Send', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByLabel('Write a comment…').inputValue(), 'Keep draft after failure');
    assert.equal(await page.locator('article').filter({ hasText: 'Keep draft after failure' }).count(), 0);
    await page.evaluate(() => window.setCommentSkill('reading'));
    await page.getByText('No comments yet. Be the first to comment!', { exact: true }).waitFor();
    assert.equal(await page.getByText('Writing discussion', { exact: true }).count(), 0);
    delayWriting = true;
    await page.evaluate(() => window.setCommentSkill('writing'));
    await page.evaluate(() => window.setCommentSkill('reading'));
    await page.waitForTimeout(300);
    assert.equal(await page.getByText('Writing discussion', { exact: true }).count(), 0);
    delayWriting = false;
    await page.evaluate(() => window.setCommentSkill('writing'));
    await page.locator('article').filter({ hasText: 'Answering Carol' }).waitFor();
    assert.equal(await page.locator('article').filter({ hasText: 'Writing discussion' }).getByRole('button', { name: 'Delete', exact: true }).count(), 0);
    await page.locator('article').filter({ hasText: 'Answering Carol' }).getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByText('This comment has been deleted.', { exact: true }).waitFor();
    assert.equal(await page.locator('article').filter({ hasText: 'Continuing my reply' }).count(), 1);
    await page.evaluate(() => { window.commentUser = null; window.refreshCommentSession(); });
    await page.getByRole('link', { name: 'Sign in to comment' }).waitFor();
    assert.equal(await page.getByLabel('Write a comment…').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Reply', exact: true }).count(), 0);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
