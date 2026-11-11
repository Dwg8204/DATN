import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const origin='http://127.0.0.1:4197';let server,browser;
before(async()=>{
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4197','--strictPort'],{stdio:'ignore',windowsHide:true});
 let ready=false;for(let i=0;i<600;i++){try{ready=(await fetch(origin)).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,100));}
 assert.ok(ready);browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
});
after(async()=>{await browser?.close();server?.kill();});
for(const width of [1280,390])test(`R2 lazy explanation, citations, fallback, retry, locale and flag at ${width}px`,{timeout:120000},async()=>{
 const context=await browser.newContext({viewport:{width,height:900}});
 await context.addInitScript(()=>localStorage.setItem('aptimate-language','en'));
 let calls=0,mode='READY',enabled=true,locale;const errors=[];
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname.replace('/api/v1','');
  const reply=(json,status=200)=>route.fulfill({status,json,headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-headers':'content-type','access-control-allow-methods':'GET,POST,OPTIONS'}});
  if(route.request().method()==='OPTIONS')return reply({});
  if(path==='/auth/me'||path==='/profile/me')return reply({id:'student',role:'STUDENT',firstName:'Test',lastName:'Learner',email:'learner@example.invalid'});
  if(path==='/me/mistakes')return reply({itemId:'item',attemptId:'attempt',component:'READING',ragEnabled:enabled,done:false,canMarkDone:true,details:[{
   component:'READING',partNumber:1,paper:{passage:'Meet ___ Monday.',questions:[{key:'p1:q1',id:'q1',text:'Choose',options:[{id:'a',text:'on'},{id:'b',text:'at'}]}]},
   items:[{key:'p1:q1',selectedAnswer:{optionId:'b'},correctAnswer:'a',explanation:'Use on with weekdays.',outcome:{outcome:'INCORRECT'}}]
  }]});
  if(path.endsWith('/explanation')){
   calls++;locale=url.searchParams.get('locale');await new Promise(r=>setTimeout(r,100));
   if(mode==='ERROR')return reply({error:{code:'TEST_ERROR',message:'Unavailable'}},503);
   return reply({status:mode,explanation:locale==='vi'?'Dùng on trước ngày trong tuần.':'Use on before a weekday.',ruleSummary:mode==='READY'?'On + weekday.':'',tip:mode==='READY'?'Practise on Monday.':'',notice:mode==='FALLBACK'?'NO_LESSON':undefined,sources:mode==='READY'?[{chunkId:'chunk',title:'Weekday prepositions',excerpt:'Use on with days of the week.',url:'https://example.org/lesson'}]:[]});
  }
  if(path==='/chatbot/status')return reply({data:{enabled:false}});
  return reply({items:[]});
 });
 try{
  await page.goto(`${origin}/profile/mistakes?itemId=item`,{waitUntil:'domcontentloaded'});
  const button=page.getByRole('button',{name:'Why is this wrong?'});await button.waitFor();assert.equal(calls,0);
  await button.click();await page.getByText('Use on before a weekday.',{exact:true}).waitFor();assert.equal(calls,1);assert.equal(locale,'en');
  const source=page.getByRole('link',{name:'Weekday prepositions'});assert.equal(await source.getAttribute('target'),'_blank');assert.match(await source.getAttribute('rel'),/noopener/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await button.click();mode='FALLBACK';await button.click();await page.getByText('A detailed lesson is not available for this question yet.').waitFor();
  await button.click();mode='ERROR';await button.click();await page.getByRole('button',{name:'Try again',exact:true}).waitFor();
  mode='READY';await page.getByRole('button',{name:'Try again',exact:true}).click();await source.waitFor();
  await page.evaluate(async()=>{const {default:i18n}=await import('/src/i18n/index.js');await i18n.changeLanguage('vi');});
  await page.getByText('Dùng on trước ngày trong tuần.',{exact:true}).waitFor();assert.equal(locale,'vi');
  enabled=false;await page.reload();await page.getByRole('heading',{level:1}).waitFor();assert.equal(await page.getByRole('button',{name:'Vì sao sai?'}).count(),0);
  assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
