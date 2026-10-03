import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createSpeakingDraft } from '../src/features/admin/speaking/data/speakingTestModel.js';

const origin = 'http://127.0.0.1:4178';
const storageModule = '/src/features/admin/shared-test-builder/builderDraftStorage.js';
const frontendRoot = fileURLToPath(new URL('..', import.meta.url));
let browser;
let server;
let serverLog = '';

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4178', '--strictPort'], {
    cwd: frontendRoot, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', output => { serverLog += output; });
  server.stderr.on('data', output => { serverLog += output; });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { ready = (await fetch(origin)).ok; } catch { /* Vite is starting. */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, serverLog);
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BUILDER_BROWSER_CHANNEL ? { channel: process.env.BUILDER_BROWSER_CHANNEL }
      : process.platform === 'win32' ? { channel: 'msedge' } : {}),
  });
});

after(async () => { await browser?.close(); server?.kill(); });

async function session() {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  page.on('dialog', dialog => dialog.accept());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const state = { userId: 'admin-1', offline: false, failMedia: false, failSave: false, failPublish: false, records: new Map(), creates: 0, updates: 0, publishes: 0 };
  await context.route('**/*', route => {
    const url = route.request().url();
    return url.startsWith(origin) || url.includes('/api/v1/') ? route.continue() : route.abort();
  });
  await context.route('**/api/v1/**', async route => {
    if (state.offline) return route.abort('internetdisconnected');
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    const headers = { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' };
    const respond = (json, status = 200) => route.fulfill({ json, status, headers });
    if (request.method() === 'OPTIONS') return respond({});
    if (path === '/profile/me' || path === '/auth/me') return respond({ id: state.userId, role: 'ADMIN', email: 'qa@example.com', firstName: 'QA', lastName: 'Admin' });
    if (path.startsWith('/admin/media/')) {
      if (state.mediaDelay) await state.mediaDelay;
      return state.failMedia ? respond({ error: { message: 'Upload unavailable' } }, 503) : respond({ url: 'https://example.com/uploaded-media.jpg' });
    }
    const match = path.match(/^\/(?:admin\/)?(reading|listening|speaking|writing|grammar)-tests(?:\/([^/]+))?(\/publish)?$/);
    if (!match) return respond({ tests: [], total: 0 });
    const [, skill, id, publishing] = match;
    if (request.method() === 'GET') {
      return id ? respond(state.records.get(`${skill}:${id}`) || {}, state.records.has(`${skill}:${id}`) ? 200 : 404) : respond({ tests: [], total: 0 });
    }
    if (publishing) {
      state.publishes += 1;
      if (state.failPublish) return respond({ error: { message: 'Publishing unavailable' } }, 503);
      const saved = { ...state.records.get(`${skill}:${id}`), status: 'PUBLISHED' };
      state.records.set(`${skill}:${id}`, saved);
      return respond(saved);
    }
    if (state.failSave) return respond({ error: { message: 'Saving unavailable' } }, 503);
    const value = request.postDataJSON();
    if (!id && value.creationRequestId) {
      const previous = [...state.records.entries()].find(([key, record]) => key.startsWith(`${skill}:`) && record.creationRequestId === value.creationRequestId);
      if (previous) return respond({ ...previous[1], creationReplayed: true });
    }
    const newId = id || `${skill}-saved-${++state.creates}`;
    if (id) state.updates += 1;
    const previous = state.records.get(`${skill}:${newId}`);
    if (id && value.version !== previous?.version) return respond({ error: { message: 'Version conflict' } }, 409);
    const saved = { ...value, id: newId, version: (previous?.version || 0) + 1, status: 'DRAFT', updatedAt: new Date().toISOString() };
    state.records.set(`${skill}:${newId}`, saved);
    if (!id && state.dropCreateResponse) { state.dropCreateResponse = false; return route.abort('connectionreset'); }
    return respond(saved);
  });
  return { context, page, state, errors };
}

function titleField(page) { return page.locator('section').filter({ has: page.getByRole('heading', { name: 'INFORMATION TEST', exact: true }) }).locator('input:not([type=file])').first(); }
async function saved(page) { await page.locator('[data-draft-saving="false"][data-draft-error="false"]').waitFor(); }
async function drafts(page) { return page.evaluate(async path => (await import(path)).builderDraftStorage.list(), storageModule); }
async function enterPart(page, number) {
  await page.locator('article').filter({ has: page.getByText(`Part ${number}`, { exact: true }) }).getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('button', { name: 'Back to test information', exact: true }).waitFor();
}

const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64');

for (const skill of ['reading', 'listening', 'speaking', 'writing', 'grammar']) {
  for (const [purpose, mode] of [['EXAM', 'full'], ['PRACTICE', 'full'], ['PRACTICE', 'part1']]) {
    test(`${skill} ${purpose}/${mode}: Information, cover and unfinished part survive navigation and reload`, async () => {
      const { context, page, state, errors } = await session();
      try {
        state.failMedia = true;
        await page.goto(`${origin}/admin/tests/new/${skill}?purpose=${purpose}&mode=${mode}`);
        const title = `${skill} ${purpose} draft`;
        await titleField(page).fill(title);
        await page.locator('section').filter({ has: page.getByRole('heading', { name: 'INFORMATION TEST', exact: true }) }).locator('input[type=file]').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: image });
        await page.getByRole('button', { name: 'Replace image' }).waitFor();
        await saved(page);
        const draftId = new URL(page.url()).searchParams.get('draftId');
        assert.ok(draftId);
        await enterPart(page, 1);
        const editable = page.locator('[contenteditable=true]').first();
        await editable.fill('Unfinished part content');
        await saved(page);
        const beforeReload = (await drafts(page)).find(item => item.draftId === draftId);
        assert.equal(beforeReload.test.details.title, title);
        assert.match(beforeReload.test.details.pictureUrl, /^data:image\//);
        await page.reload();
        await page.getByRole('button', { name: 'Back to test information', exact: true }).waitFor();
        assert.match(await page.locator('[contenteditable=true]').first().innerText(), /Unfinished part content/);
        await page.getByRole('button', { name: 'Back to test information', exact: true }).click();
        assert.equal(await titleField(page).inputValue(), title);
        assert.equal(new URL(page.url()).searchParams.get('purpose'), purpose);
        assert.equal(new URL(page.url()).searchParams.get('mode'), mode);
        assert.equal(new URL(page.url()).searchParams.get('draftId'), draftId);
        if (mode === 'full') {
          await enterPart(page, 2);
          await page.getByRole('button', { name: 'Back to test information', exact: true }).click();
          assert.equal(await titleField(page).inputValue(), title);
        }
        await page.reload();
        assert.equal(await titleField(page).inputValue(), title);
        assert.equal(state.creates, 0, 'autosave must not create server tests');
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    });
  }
}

test('a malformed cached draft is preserved and reported without crashing the editor', async () => {
  const { context, page, errors } = await session();
  try {
    await page.goto(`${origin}/admin/tests/new/listening?purpose=PRACTICE&mode=part1`);
    await titleField(page).fill('Preserved malformed draft');
    await saved(page);
    await page.evaluate(async path => {
      const { builderDraftStorage: storage } = await import(path);
      const record = (await storage.list()).find(item => item.skill === 'listening');
      record.test.parts[1].questions = null;
      await storage.put(record);
    }, storageModule);
    await page.reload();
    await page.getByRole('alert').filter({ hasText: 'The saved draft has an invalid collection.' }).waitFor();
    assert.equal((await drafts(page)).find(item => item.skill === 'listening').test.details.title, 'Preserved malformed draft');
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('an API connection failure on reload keeps the builder URL and restores the draft after Retry', async () => {
  const { context, page, state } = await session();
  try {
    await page.goto(`${origin}/admin/tests/new/reading?purpose=PRACTICE&mode=part1`);
    await titleField(page).fill('Offline draft');
    await saved(page);
    const url = page.url();
    state.offline = true;
    await page.reload();
    await page.getByRole('button', { name: 'Retry', exact: true }).waitFor();
    assert.equal(page.url(), url);
    state.offline = false;
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    assert.equal(await titleField(page).inputValue(), 'Offline draft');
  } finally { await context.close(); }
});

test('losing Wi-Fi while editing and a failed server save preserve the local draft', async () => {
  const { context, page, state } = await session();
  try {
    await page.goto(`${origin}/admin/tests/new/listening?purpose=PRACTICE&mode=part1`);
    await titleField(page).fill('Before disconnect');
    state.offline = true;
    await context.setOffline(true);
    await titleField(page).fill('Edited while offline');
    await saved(page);
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.getByText('Unable to connect to the server. Please check your connection and try again.', { exact: true }).waitFor();
    assert.equal(await titleField(page).inputValue(), 'Edited while offline');
    await context.setOffline(false);
    state.offline = false;
    state.failSave = true;
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.getByText('The service is temporarily unavailable. Please try again later.', { exact: true }).waitFor();
    await page.reload();
    assert.equal(await titleField(page).inputValue(), 'Edited while offline');
    assert.equal(state.creates, 0);
  } finally { await context.close(); }
});

test('an audio upload failure retains the selected bytes through F5 and uploads on Save draft', async () => {
  const { context, page, state } = await session();
  try {
    state.failMedia = true;
    await page.goto(`${origin}/admin/tests/new/listening?purpose=PRACTICE&mode=part1`);
    await titleField(page).fill('Audio draft');
    await enterPart(page, 1);
    await page.locator('input[type=file]').first().setInputFiles({ name: 'audio.wav', mimeType: 'audio/wav', buffer: Buffer.from('RIFFlocal-draft-audio') });
    await page.getByText('Audio is stored locally. Save to the server to finish uploading.', { exact: true }).waitFor();
    await saved(page);
    await page.reload();
    await page.getByRole('button', { name: 'Back to test information', exact: true }).waitFor();
    assert.match(await page.locator('audio').first().getAttribute('src'), /^data:audio\/wav;base64,/);
    await page.getByRole('button', { name: 'Back to test information', exact: true }).click();
    state.failMedia = false;
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.waitForURL(/listening-saved-1\/edit/);
    assert.equal(state.records.get('listening:listening-saved-1').parts[1].questions[0].audioUrl, 'https://example.com/uploaded-media.jpg');
  } finally { await context.close(); }
});

test('server draft creation followed by publish failure and reload retries the same id', async () => {
  const { context, page, state } = await session();
  try {
    const testValue = { ...createSpeakingDraft('part1'), purpose: 'PRACTICE' };
    testValue.details.title = 'Speaking draft';
    testValue.parts[1].questions.forEach((question, index) => { question.text = `Question ${index + 1}`; });
    await page.goto(`${origin}/admin/tests/new/speaking?purpose=PRACTICE&mode=part1`);
    await titleField(page).waitFor();
    const draftId = new URL(page.url()).searchParams.get('draftId');
    await page.evaluate(async ({ path, draftId, value }) => {
      const module = await import(path);
      const key = module.draftKey('admin-1', 'speaking', draftId);
      const record = await module.builderDraftStorage.get(key);
      await module.builderDraftStorage.put({ ...record, test: value, dirty: true });
    }, { path: storageModule, draftId, value: testValue });
    await page.reload();
    state.failPublish = true;
    await page.getByRole('button', { name: 'Save test & preview', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Create test', exact: true }).click();
    await page.getByText('The service is temporarily unavailable. Please try again later.', { exact: true }).waitFor();
    assert.equal(state.creates, 1);
    await page.reload();
    await page.waitForURL(/speaking-saved-1\/edit/);
    assert.equal(await titleField(page).inputValue(), 'Speaking draft');
    state.failPublish = false;
    await page.getByRole('button', { name: 'Update test & preview', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Save changes', exact: true }).click();
    await page.waitForURL(/speaking-saved-1\/preview/);
    assert.equal(state.creates, 1);
    assert.equal(state.updates, 1);
    assert.equal(state.publishes, 2);
    assert.equal((await drafts(page)).some(item => item.testId === 'speaking-saved-1'), false);
  } finally { await context.close(); }
});

test('changed server versions require a decision and never overwrite recovered edits', async () => {
  const { context, page, state } = await session();
  try {
    const serverTest = { ...createSpeakingDraft('part1'), id: 'existing', purpose: 'PRACTICE', version: 1, status: 'DRAFT' };
    serverTest.details.title = 'Server title';
    state.records.set('speaking:existing', serverTest);
    await page.goto(`${origin}/admin/tests/speaking/existing/edit`);
    await titleField(page).fill('Unsaved local title');
    await saved(page);
    state.records.set('speaking:existing', { ...serverTest, version: 2, details: { ...serverTest.details, title: 'New server title' } });
    await page.reload();
    await page.getByRole('button', { name: 'Keep local changes', exact: true }).waitFor();
    assert.equal(await titleField(page).inputValue(), 'Unsaved local title');
    await page.getByRole('button', { name: 'Keep local changes', exact: true }).click();
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[aria-label="Draft status"]')?.textContent.includes('Saved on this device'));
    assert.equal(state.records.get('speaking:existing').details.title, 'Unsaved local title');
    assert.equal(state.records.get('speaking:existing').version, 3);
  } finally { await context.close(); }
});

test('different accounts and new draft ids never share draft contents', async () => {
  const { context, page, state } = await session();
  try {
    await page.goto(`${origin}/admin/tests/new/reading?purpose=PRACTICE&mode=part1&draftId=first`);
    await titleField(page).fill('Private admin draft');
    await saved(page);
    await page.goto(`${origin}/admin/tests/new/reading?purpose=PRACTICE&mode=part1&draftId=second`);
    assert.equal(await titleField(page).inputValue(), '');
    state.userId = 'admin-2';
    await page.goto(`${origin}/admin/tests/new/reading?purpose=PRACTICE&mode=part1&draftId=first`);
    assert.equal(await titleField(page).inputValue(), '');
    assert.equal((await drafts(page)).find(item => item.userId === 'admin-1' && item.draftId === 'first').test.details.title, 'Private admin draft');
  } finally { await context.close(); }
});

test('a delayed audio upload cannot erase question text entered while it was uploading', async () => {
  const { context, page, state } = await session();
  let release;
  try {
    state.mediaDelay = new Promise(resolve => { release = resolve; });
    await page.goto(`${origin}/admin/tests/new/listening?purpose=PRACTICE&mode=part1`);
    await titleField(page).fill('Delayed upload');
    await enterPart(page, 1);
    await page.locator('input[type=file]').first().setInputFiles({ name: 'audio.wav', mimeType: 'audio/wav', buffer: Buffer.from('RIFFdelayed-audio') });
    await page.getByText('Audio is stored locally. Save to the server to finish uploading.', { exact: true }).waitFor();
    await page.locator('[contenteditable=true]').first().fill('Text entered during upload');
    release();
    await page.waitForFunction(() => document.querySelector('audio')?.getAttribute('src') === 'https://example.com/uploaded-media.jpg');
    assert.equal(await page.locator('[contenteditable=true]').first().innerText(), 'Text entered during upload');
    await saved(page);
    await page.reload();
    assert.equal(await page.locator('[contenteditable=true]').first().innerText(), 'Text entered during upload');
  } finally { release?.(); await context.close(); }
});

test('IndexedDB transactions reject a stale tab without overwriting its newer stored version', async () => {
  const { context, page } = await session();
  try {
    await page.goto(`${origin}/admin/tests/new/reading?purpose=PRACTICE&mode=part1`);
    await titleField(page).fill('Original');
    await saved(page);
    const result = await page.evaluate(async path => {
      const { builderDraftStorage: storage, DraftWriter } = await import(path);
      const record = (await storage.list()).find(item => item.skill === 'reading');
      const first = new DraftWriter(storage, record);
      const second = new DraftWriter(storage, record);
      await first.write({ ...record.test, details: { ...record.test.details, title: 'Newer tab' } });
      let conflict;
      try { await second.write({ ...record.test, details: { title: 'Stale tab' } }); }
      catch (error) { conflict = error.message; }
      return { conflict, title: (await storage.get(record.key)).test.details.title };
    }, storageModule);
    assert.match(result.conflict, /another tab/);
    assert.equal(result.title, 'Newer tab');
  } finally { await context.close(); }
});

for (const skill of ['reading', 'listening', 'speaking', 'writing', 'grammar']) {
  test(`${skill}: Save draft accepts incomplete content and reload opens the same server id`, async () => {
    const { context, page, state, errors } = await session();
    try {
      await page.goto(`${origin}/admin/tests/new/${skill}?purpose=PRACTICE&mode=part1`);
      const title = `${skill} incomplete server draft`;
      await titleField(page).fill(title);
      await page.getByRole('button', { name: 'Save draft', exact: true }).click();
      await page.waitForURL(new RegExp(`${skill}-saved-1/edit`));
      await page.reload();
      assert.equal(await titleField(page).inputValue(), title);
      assert.equal(state.creates, 1);
      assert.equal(state.publishes, 0);
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });
}

for (const skill of ['reading', 'listening', 'speaking', 'writing', 'grammar']) {
  test(skill + ': a lost create response reuses the server id and saves edits made before retry', async () => {
    const { context, page, state, errors } = await session();
    try {
      await page.goto(origin + '/admin/tests/new/' + skill + '?purpose=PRACTICE&mode=part1');
      await titleField(page).fill('First creation title'); await saved(page);
      state.dropCreateResponse = true;
      const failedRequest = page.waitForEvent('requestfailed', request => request.method() === 'POST' && request.url().includes(skill + '-tests'));
      await page.getByRole('button', { name: 'Save draft', exact: true }).click();
      await failedRequest;
      await page.getByRole('button', { name: 'Save draft', exact: true }).waitFor();
      await page.reload(); await titleField(page).waitFor();
      await titleField(page).fill('Updated after response loss'); await saved(page);
      await page.getByRole('button', { name: 'Save draft', exact: true }).click();
      await page.waitForURL('**/' + skill + '-saved-1/edit?**');
      assert.equal(state.creates, 1);
      assert.equal(state.records.size, 1);
      assert.equal(state.records.get(skill + ':' + skill + '-saved-1').details.title, 'Updated after response loss');
      await page.reload();
      assert.equal(await titleField(page).inputValue(), 'Updated after response loss');
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });
}

test('a failed IndexedDB move retries with the latest edits and keeps the server identity', async () => {
  const { context, page, state, errors } = await session();
  try {
    await page.goto(origin + '/admin/tests/new/reading?purpose=PRACTICE&mode=part1');
    await titleField(page).fill('Before migration'); await saved(page);
    await page.evaluate(async path => {
      const storage = (await import(path)).builderDraftStorage;
      window.restoreDraftMove = () => { storage.move = window.originalDraftMove; };
      window.originalDraftMove = storage.move;
      storage.move = async () => { throw new Error('Simulated quota failure'); };
    }, storageModule);
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.getByRole('button', { name: 'Retry local save', exact: true }).waitFor();
    await titleField(page).fill('Edits after failed migration');
    await page.getByRole('button', { name: 'Retry local save', exact: true }).waitFor();
    await page.evaluate(() => window.restoreDraftMove());
    await page.getByRole('button', { name: 'Retry local save', exact: true }).click();
    await saved(page); await page.reload();
    await page.waitForURL('**/reading-saved-1/edit?**');
    assert.equal(await titleField(page).inputValue(), 'Edits after failed migration');
    assert.equal(state.creates, 1);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

for (const action of ['remove', 'replace URL']) {
  test('pending audio upload cannot undo ' + action, async () => {
    const { context, page, state, errors } = await session();
    try {
      await page.goto(origin + '/admin/tests/new/listening?purpose=PRACTICE&mode=part1');
      await titleField(page).fill('Pending audio'); await enterPart(page, 1);
      let release;
      state.mediaDelay = new Promise(resolve => { release = resolve; });
      let respond;
      const responded = new Promise(resolve => { respond = resolve; });
      page.on('response', response => { if (response.url().includes('/admin/media/audio')) respond(); });
      const field = page.locator('section').filter({ has: page.getByText('Question 1 audio', { exact: true }) }).first();
      await field.locator('input[type=file]').setInputFiles({ name: 'sample.wav', mimeType: 'audio/wav', buffer: Buffer.from('RIFFtest') });
      await field.getByRole('button', { name: 'Remove', exact: true }).waitFor();
      if (action === 'remove') await field.getByRole('button', { name: 'Remove', exact: true }).click();
      else await field.getByRole('textbox', { name: 'Question 1 audio URL' }).fill('https://example.com/replacement.mp3');
      release(); await responded;
      await field.getByRole('button', { name: 'Upload audio', exact: true }).waitFor();
      if (action === 'remove') assert.equal(await field.locator('audio').count(), 0);
      else assert.equal(await field.locator('audio').getAttribute('src'), 'https://example.com/replacement.mp3');
      await saved(page); await page.reload();
      await page.getByRole('button', { name: 'Back to test information', exact: true }).waitFor();
      const record = (await drafts(page)).find(item => item.skill === 'listening');
      assert.equal(record.test.parts[1].questions[0].audioUrl, action === 'remove' ? '' : 'https://example.com/replacement.mp3');
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });
}

test('leaving the builder asks for confirmation and preserves the draft', async () => {
 const {context,page,errors}=await session();
 try {
  await page.goto(origin+'/admin/tests/new/reading?purpose=PRACTICE&mode=part1');
  await titleField(page).fill('Leave guard draft'); await saved(page);
  const url=page.url(); await enterPart(page,1);
  assert.equal(await page.getByRole('dialog').count(),0);
  await page.getByRole('button',{name:'Back to test information',exact:true}).click();
  await page.locator('a[href="/admin/dashboard"]').first().click();
  await page.getByRole('dialog',{name:'Leave test editor?'}).waitFor();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(page.url(),url);
  assert.equal(await titleField(page).inputValue(),'Leave guard draft');
  await page.locator('a[href="/admin/dashboard"]').first().click();
  await page.getByRole('button',{name:'Keep draft & leave',exact:true}).click();
  await page.waitForURL('**/admin/dashboard'); await page.goto(url);
  assert.equal(await titleField(page).inputValue(),'Leave guard draft');
  assert.deepEqual(errors,[]);
 } finally {await context.close();}
});
test('refreshing a dirty draft requests native beforeunload confirmation',async()=>{
 const {context,page}=await session();
 try {
  await page.goto(origin+'/admin/tests/new/reading?purpose=PRACTICE&mode=part1');
  await titleField(page).fill('Close tab guard'); await saved(page);
  const dialog=page.waitForEvent('dialog'); await page.reload();
  assert.equal((await dialog).type(),'beforeunload');
  assert.equal(await titleField(page).inputValue(),'Close tab guard');
  const url = page.url();
  const closeDialog = page.waitForEvent('dialog');
  await page.close({ runBeforeUnload: true });
  assert.equal((await closeDialog).type(), 'beforeunload');
  const reopened = await context.newPage();
  await reopened.goto(url);
  assert.equal(await titleField(reopened).inputValue(), 'Close tab guard');
 }finally{await context.close();}
});
