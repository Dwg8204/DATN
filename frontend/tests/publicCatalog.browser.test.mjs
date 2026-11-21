import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createSpeakingDraft } from '../src/features/admin/speaking/data/speakingTestModel.js';

const origin = 'http://127.0.0.1:4179';
const storageModule = '/src/features/admin/shared-test-builder/builderDraftStorage.js';
const frontendRoot = fileURLToPath(new URL('..', import.meta.url));
let browser;
let server;
let serverLog = '';

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4179', '--strictPort'], {
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


async function catalogSession(authenticated = false, itemCount = 1) {
 const context=await browser.newContext(); const page=await context.newPage(); page.setDefaultTimeout(10000); page.setDefaultNavigationTimeout(30000);
 const calls={history:0,start:0}; const errors=[]; page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',route=>route.request().url().startsWith(origin)||route.request().url().includes('/api/v1/')?route.continue():route.abort());
 await context.route('**/api/v1/**', async route=>{
  const request=route.request(), url=new URL(request.url()),path=url.pathname.replace('/api/v1','');
  const headers={'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-headers':'content-type','access-control-allow-methods':'GET,POST,OPTIONS'};
  const respond=(json,status=200)=>route.fulfill({json,status,headers});
  if(request.method()==='OPTIONS')return respond({});
  if(path==='/profile/me'||path==='/auth/me')return authenticated?respond({id:'student-1',role:'STUDENT',firstName:'Student'}):respond({error:{message:'Sign in'}},401);
  if(path==='/auth/refresh')return respond({error:{message:'Sign in'}},401);
  if(path.includes('/comments')) return respond({data:{comments:[],total:0,page:1,pageSize:20,hasMore:false}});
  if(path.includes('attempt')){
   if(request.method()==='POST')calls.start++;else calls.history++;
   return respond({data:[{testId:'catalog-test',attemptId:'attempt-1',status:'SUBMITTED',submittedAt:'2026-10-01T10:00:00Z',score:8,maxScore:10}]});
  }
  if(/(reading|listening|speaking|writing|grammar)-tests/.test(path)){
   const row={id:'catalog-test',title:'Public catalog test',name:'Public catalog test',mode:url.searchParams.get('mode')||'full',section:'Full Test',questionType:'Test'};
   const rows=Array.from({length:itemCount},(_,index)=>({...row,id:index ? `catalog-test-${index}` : row.id,title:itemCount===1 ? row.title : `Public catalog test ${index+1}`}));
   return respond({data:rows,tests:rows,pagination:{totalItems:itemCount}});
  }
  return respond({data:[]});
 });
 return {context,page,calls,errors};
}
for(const skill of ['reading','listening','speaking','writing','grammar-vocab']){
 for(const section of ['tests','practice']){
  test('guest can browse '+skill+'/'+section+' without history and is asked to login only on Start',async()=>{
   const {context,page,calls,errors}=await catalogSession();
   try{
    await page.goto(origin+'/'+skill+'/'+section, { waitUntil: 'domcontentloaded' });
    await page.getByText('Public catalog test',{exact:true}).waitFor();
    assert.ok(page.url().includes('/'+skill+'/'+section));
    assert.equal(await page.getByText(/^(Completed|Complete|Not Started|In Progress|Đã hoàn thành|Chưa bắt đầu)$/i).count(),0);
    assert.equal(calls.history,0); assert.equal(calls.start,0);
    await page.getByRole('button',{name:/^(Start|Bắt đầu)$/i}).click();
    await page.waitForURL('**/login'); assert.equal(calls.start,0);
    assert.deepEqual(errors,[]);
   }finally{await context.close();}
  });
 }
 test('authenticated '+skill+' catalog retains completion status',async()=>{
  const {context,page,calls,errors}=await catalogSession(true);
  try{
   await page.goto(origin+'/'+skill+'/tests', { waitUntil: 'domcontentloaded' });
   await page.getByText('Public catalog test',{exact:true}).waitFor();
   await page.getByText(/^(Completed|Đã hoàn thành)$/i).waitFor();
   assert.ok(calls.history>0);assert.deepEqual(errors,[]);
  }finally{await context.close();}
 });
}

for (const width of [1850, 1024, 390]) {
 test(`catalog fills search width without dropdown chevrons at ${width}px`, async () => {
  const {context,page}=await catalogSession(false,8);
  try {
   await page.setViewportSize({width,height:1000});
   for (const theme of ['light','dark']) {
    for (const section of ['tests','practice']) {
     await page.goto(origin+'/speaking/'+section,{waitUntil:'domcontentloaded'});
     await page.getByText('Public catalog test 1',{exact:true}).waitFor();
     await page.evaluate(theme=>document.documentElement.setAttribute('data-theme',theme),theme);
     const label=page.locator('[class*="tabsLabel"]');
     assert.equal(await label.locator('svg').count(),0);
     const grid=await page.locator('[class*="gridRow"]').boundingBox();
     const search=await page.locator('[class*="searchRow"]').boundingBox();
     assert.ok(Math.abs(grid.x-search.x)<2);
     assert.ok(Math.abs(grid.x+grid.width-search.x-search.width)<2);
     const cards=await page.locator('[class*="testCard"]').evaluateAll(nodes=>nodes.map(node=>{
      const r=node.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right};
     }));
     const firstRow=cards.filter(card=>Math.abs(card.y-cards[0].y)<2);
     assert.ok(Math.abs(firstRow.at(-1).right-search.x-search.width)<2);
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
     if(width===1850&&section==='tests') await page.screenshot({path:`${process.env.TEMP || '.'}/aptimate-catalog-${theme}.png`,fullPage:true});
    }
   }
  } finally {await context.close();}
 });
}
