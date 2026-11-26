import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const origin='http://127.0.0.1:4198';let server,browser;
before(async()=>{
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4198','--strictPort'],{stdio:'ignore',windowsHide:true});
 let ready=false;for(let i=0;i<600;i++){try{ready=(await fetch(origin)).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,100));}
 assert.ok(ready);browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
});
after(async()=>{await browser?.close();server?.kill();});
for(const width of [1280,390])test(`R3 plan evidence, legacy items and locale at ${width}px`,{timeout:120000},async()=>{
 const context=await browser.newContext({viewport:{width,height:900}, colorScheme:width===390?'dark':'light'});await context.addInitScript(()=>localStorage.setItem('aptimate-language','en'));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const today='2026-11-12';
 const items=[{tier:1,matchCount:5,matchedTopics:['Conditionals']},{tier:2,matchCount:0,matchedTopics:['Prepositions']},{tier:3,matchCount:0,matchedTopics:[]},null].map((retrieval,i)=>({id:`i${i}`,activityType:i===1?'TOPIC_REVIEW':'TEST',component:'READING',testId:`test${i}`,title:`Practice ${i}`,purpose:'PRACTICE',scheduledOn:today,targetCount:1,doneCount:0,available:true,retrieval}));
 Object.assign(items[0], {completedAt: today, doneCount: 1, reviewAttempt: {id:'submitted-reading',purpose:'PRACTICE'}});
 let starts = 0;
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname.replace('/api/v1','');let json={items:[],data:[],count:0,unreadCount:0};
  if(route.request().method()==='POST' && path.includes('practice-attempts')) starts++;
  if(path.includes('/submitted-reading/') && path.endsWith('/result')) json={component:'READING',title:'Submitted reading result',result:{score:3,maxScore:5}};
  if(path==='/auth/me'||path==='/profile/me')json={id:'student',role:'STUDENT',firstName:'Test',lastName:'Learner'};
  if(path==='/me/personalization/overview')json={goal:null,progress:null,profile:{bySkill:[],placement:{complete:true}},plan:{weekIndex:1,source:'RULE',items},today,comment:{status:'READY',comment:null},recentReports:[],needsSync:false};
  if(path.includes('dashboard'))json={totalTests:0,skillCounts:{},partCounts:{},scoreOverTime:[],skillDistribution:[]};
  if(path==='/chatbot/status')json={data:{enabled:false}};
  return route.fulfill({json,headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-headers':'content-type','access-control-allow-methods':'GET,POST,OPTIONS'}});
 });
 try{
  await page.goto(`${origin}/profile/dashboard`,{waitUntil:'commit'});
  await page.getByTestId('retrieval-match').first().waitFor();
  assert.match(await page.getByTestId('retrieval-match').first().innerText(),/Matches 5 recent mistakes.*Conditionals/);
  assert.match(await page.getByTestId('retrieval-topic').first().innerText(),/Topic to review: Prepositions/);
  assert.equal(await page.locator('[data-testid="retrieval-match"]:visible').count(),1);
  assert.equal(await page.locator('[data-testid="retrieval-topic"]:visible').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const plan = page.locator('section').filter({has:page.locator('li[data-complete]')}).last();
  const meter = page.locator('section:has(> details) > progress');
  assert.deepEqual(await meter.evaluate(el => [el.value, el.max]), [1, 4]);
  const rowColor = completed => page.locator('li[data-complete="' + completed + '"]:visible').first().evaluate(el => getComputedStyle(el).backgroundColor);
  assert.notEqual(await rowColor(true), await rowColor(false));
  const week = page.locator('details:has(li[data-complete]) > summary');
  await week.focus();
  await week.press('Enter');
  assert.equal(await plan.locator('li:visible').count(), 4);
  await week.press('Enter');
  await page.getByTestId('retrieval-match').first().locator('..').getByRole('button').click();
  await page.waitForURL('**/reading/result?attemptId=submitted-reading&practice=true');
  await page.getByRole('heading',{name:'Submitted reading result'}).waitFor();
  await page.getByRole('link',{name:'Back',exact:true}).click();
  await page.waitForURL('**/profile/dashboard');
  assert.equal(starts,0);
  await page.evaluate(async()=>{const {default:i18n}=await import('/src/i18n/index.js');await i18n.changeLanguage('vi');});
  await page.getByText('Khớp 5 câu với lỗi gần đây · Conditionals',{exact:true}).first().waitFor();
  assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
