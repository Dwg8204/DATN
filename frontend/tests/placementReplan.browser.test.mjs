import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const origin='http://127.0.0.1:4199';let server,browser;
before(async()=>{
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4199','--strictPort'],{stdio:'ignore',windowsHide:true});
 let ready=false;for(let i=0;i<600;i++){try{ready=(await fetch(origin)).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,100));}
 assert.ok(ready);browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
});
after(async()=>{await browser?.close();server?.kill();});
for(const width of [1280,390])test(`R4 dashboard sync, notice once per plan and unavailable storage at ${width}px`,{timeout:120000},async()=>{
 const context=await browser.newContext({viewport:{width,height:900}});
 await context.addInitScript(()=>localStorage.setItem('aptimate-language','en'));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let needsSync=true,replanned=false,planId='r4-plan-one',syncs=0;
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname.replace('/api/v1','');let json={items:[],data:[],count:0,unreadCount:0};
  if(path==='/auth/me'||path==='/profile/me')json={id:'student',role:'STUDENT',firstName:'Lan',lastName:'Test'};
  if(path==='/me/personalization/sync'&&route.request().method()==='POST'){syncs++;needsSync=false;replanned=true;json={synced:true};}
  if(path==='/me/personalization/overview')json={goal:null,progress:null,profile:{bySkill:[],placement:{complete:true}},
   plan:{id:planId,weekIndex:1,source:'RULE',replannedAfterPlacementAt:replanned?'2026-11-15T05:00:00Z':null,items:[{id:'item',activityType:'TEST',component:'READING',testId:'test',title:'Conditional practice',purpose:'PRACTICE',scheduledOn:'2026-11-16',targetCount:1,doneCount:0,available:true,retrieval:{tier:1,matchCount:2,matchedTopics:['Conditionals']}}]},
   today:'2026-11-16',comment:{status:'READY',comment:null},recentReports:[],needsSync};
  if(path.includes('dashboard'))json={totalTests:0,skillCounts:{},partCounts:{},scoreOverTime:[],skillDistribution:[]};
  if(path==='/chatbot/status')json={data:{enabled:false}};
  return route.fulfill({json,headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-headers':'content-type','access-control-allow-methods':'GET,POST,OPTIONS'}});
 });
 try{
  await page.goto(`${origin}/profile/dashboard`,{waitUntil:'domcontentloaded'});
  const notice=page.getByTestId('placement-replan-notice');await notice.waitFor();assert.equal(syncs,1);
  await page.getByTestId('retrieval-match').first().waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.getByRole('button',{name:'Dismiss notice'}).click();assert.equal(await notice.count(),0);
  await page.reload();await page.getByTestId('retrieval-match').first().waitFor();assert.equal(await notice.count(),0);assert.equal(syncs,1);
  planId='r4-plan-two';await page.reload();await notice.waitFor();
  await page.evaluate(async()=>{const {default:i18n}=await import('/src/i18n/index.js');await i18n.changeLanguage('vi');});
  await page.getByText('Lộ trình tuần này đã được điều chỉnh theo kết quả đánh giá đầu vào.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Đóng thông báo'}).click();assert.equal(await notice.count(),0);
  // Read and write failures must not break the dashboard or prevent dismissal.
  planId='r4-plan-storage-blocked';
  await page.addInitScript(()=>{
   const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
   Storage.prototype.getItem=function(key){if(key.startsWith('aptimate:placement-replan'))throw new Error('storage blocked');return get.call(this,key);};
   Storage.prototype.setItem=function(key,value){if(key.startsWith('aptimate:placement-replan'))throw new Error('storage blocked');return set.call(this,key,value);};
  });
  await page.reload();await notice.waitFor();await notice.getByRole('button').click();assert.equal(await notice.count(),0);
  replanned=false;planId='legacy';await page.reload();await page.getByTestId('retrieval-match').first().waitFor();assert.equal(await notice.count(),0);
  assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
