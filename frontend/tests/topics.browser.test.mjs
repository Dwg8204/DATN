import test from 'node:test';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

test('topic management and human review, English/Vietnamese and mobile',async()=>{
  const bundle=await build({stdin:{resolveDir:fileURLToPath(new URL('..',import.meta.url)),loader:'jsx',contents:`
    import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter,Routes,Route} from 'react-router-dom';
    import i18n from './src/i18n/index.js';import TopicsPage from './src/features/admin/topics/TopicsPage.jsx';
    i18n.changeLanguage('en');window.language=l=>i18n.changeLanguage(l);
    createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/admin/learning-topics']}><Routes><Route path='/admin/learning-topics' element={<TopicsPage/>}/><Route path='/admin/topic-labels' element={<TopicsPage review/>}/></Routes></MemoryRouter>);
  `},bundle:true,write:false,outfile:'topics.js',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','import.meta.env':'{}'}});
  const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const topics=[{id:'topic1',question_count:2,pending_count:2,approved_count:0,test_count:1,code:'present-simple',name:'Present simple',component:'GRAMMAR_VOCAB',topic_type:'KNOWLEDGE',is_active:true},{id:'topic2',code:'past-simple',name:'Past simple',component:'GRAMMAR_VOCAB',topic_type:'KNOWLEDGE',is_active:true}];
    const labels=[1,2].map(n=>({id:'label'+n,question_id:'q'+n,topic_id:'topic1',topic_name:'Present simple',question_hash:'hash',current_hash:'hash',part_number:1,question_key:'p1:q'+n,content:{text:'He ___ every day.'},correct_answer:{answer:'works'},part_contents:{},confidence:.7,source:'AI',status:'SUGGESTED'}));
    const writes=[],batches=[],filters=[],wholeApprovals=[];let suggested=0;
    await page.route('**/*',async route=>{
      const req=route.request(),url=new URL(req.url()),path=url.pathname.replace('/api/v1','');
      const ok=data=>route.fulfill({json:data});
      if(url.hostname==='topics-ui.test')return route.fulfill({contentType:'text/html',body:'<html><head><style>body{font-family:Arial,sans-serif;background:#f7f7f7;margin:20px}*{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>'});
      if(path==='/admin/learning-topics'&&req.method()==='GET')return ok({items:topics,coverage:[{component:'GRAMMAR_VOCAB',approved:4,total:5}]});
      if(path.startsWith('/admin/learning-topics/')&&req.method()==='DELETE'){const topic=topics.find(t=>t.id===path.split('/').at(-1));topic.is_active=false;return ok(topic);}
      if(path.startsWith('/admin/learning-topics')&&req.method()==='PATCH'){const id=path.split('/').at(-1),body=req.postDataJSON();Object.assign(topics.find(t=>t.id===id),body,{is_active:body.isActive});return ok({id});}
      if(path==='/admin/learning-topics'&&req.method()==='POST'){const body=req.postDataJSON();topics.push({...body,id:'new',topic_type:body.topicType,is_active:body.isActive});return ok({id:'new'});}
      if(path==='/admin/topic-labels/progress')return ok({questions:5,labeled:2,tests:2,completed:0,queued:2,retrying:0,failed:0,pending:2,workerEnabled:true,aiEnabled:true});
      if(path==='/admin/topic-labels/suggest-missing'){batches.push(req.postDataJSON());return ok({queued:2});}
      if(path==='/admin/topic-labels/tests')return ok({items:[{id:'test',title:'Grammar fixture',component:'GRAMMAR_VOCAB',pending:labels.filter(l=>l.status==='SUGGESTED').length}]});
      if(path==='/admin/topic-labels'){filters.push(url.searchParams.get('reviewFilter'));return ok({items:labels.filter(l=>url.searchParams.get('status')==='ALL'||l.status===url.searchParams.get('status')),questions:[{id:'q1',question_key:'p1:q1',question_hash:'hash',content:{text:'He ___ every day.'}}]});}
      if(path==='/admin/topic-labels/review'){const {items}=req.postDataJSON();writes.push(items);for(const item of items){const l=labels.find(l=>l.id===item.labelId);if(l){l.status=item.status;l.topic_id=item.topicId;}}return ok({reviewed:items.length});}
      if(path.endsWith('/topic-approval')){const pending=labels.filter(l=>l.status==='SUGGESTED');return ok({title:'Grammar fixture',revision:'a'.repeat(64),labels:pending.length,questions:pending.length,skipped:0});}
      if(path.endsWith('/approve-topics')){wholeApprovals.push(req.postDataJSON());const pending=labels.filter(l=>l.status==='SUGGESTED');for(const l of pending)l.status='APPROVED';return ok({reviewed:pending.length,questions:pending.length,skipped:0});}
      if(path.endsWith('/suggest-topics')){suggested++;return ok({queued:true});}
      return route.abort();
    });
    await page.goto('https://topics-ui.test');await page.addStyleTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.css')).text});await page.addScriptTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.js')).text});
    await page.getByRole('heading',{name:'Topic management',exact:true}).waitFor();
    await page.getByLabel('Search',{exact:true}).fill('past');
    await page.getByRole('heading',{name:'Past simple',exact:true}).waitFor();
    assert.equal(await page.getByRole('heading',{name:'Present simple',exact:true}).count(),0);
    await page.getByLabel('Search',{exact:true}).fill('');
    await page.getByRole('heading',{name:'Present simple',exact:true}).waitFor();
    const shots=join(tmpdir(),'aptimate-topics-ui');await mkdir(shots,{recursive:true});
    await page.setViewportSize({width:1280,height:900});await page.screenshot({path:join(shots,'catalog-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:join(shots,'catalog-mobile.png'),fullPage:true});
    assert.equal(await page.getByRole('button',{name:'Refresh',exact:true}).count(),0);
    await page.getByText('80%',{exact:true}).waitFor();
    await page.locator('article').first().getByRole('button',{name:'View topic details'}).click();
    await page.getByRole('dialog').getByText('Linked questions',{exact:true}).waitFor();
    assert.equal(await page.getByRole('dialog').getByText('Linked questions',{exact:true}).locator('..').locator('strong').textContent(),'2');
    await page.screenshot({path:join(shots,'topic-detail-mobile.png'),fullPage:true});
    await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
    await page.getByRole('button',{name:'Add topic',exact:true}).click();
    await page.getByLabel('Topic code').fill('articles');await page.getByLabel('Name',{exact:true}).fill('Articles');await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByRole('heading',{name:'Articles',exact:true}).waitFor();
    const card=page.locator('article').filter({has:page.getByRole('heading',{name:'Articles',exact:true})});await card.getByRole('button',{name:'Edit topic'}).click();await page.getByLabel('Active',{exact:true}).uncheck();await page.getByRole('button',{name:'Save',exact:true}).click();await card.getByText('Hidden',{exact:true}).waitFor();
    await card.getByRole('button',{name:'Edit topic'}).click();await page.getByLabel('Active',{exact:true}).check();await page.getByRole('button',{name:'Save',exact:true}).click();await card.getByText('Active',{exact:true}).waitFor();
    await card.getByRole('button',{name:'Delete topic'}).click();await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(topics.find(t=>t.id==='new').is_active,true);
    await card.getByRole('button',{name:'Delete topic'}).click();await page.getByRole('dialog').getByRole('button',{name:'Delete topic',exact:true}).click();await card.getByText('Hidden',{exact:true}).waitFor();assert.equal(topics.find(t=>t.id==='new').is_active,false);
    await page.getByLabel('Rows per page',{exact:true}).fill('1');
    await page.getByRole('button',{name:'Apply',exact:true}).click();
    assert.equal(await page.locator('article').count(),1);
    await page.getByRole('button',{name:'2',exact:true}).click();
    await page.getByRole('heading',{name:'Past simple',exact:true}).waitFor();
    await page.getByRole('link',{name:'Topic review',exact:true}).click();
    await page.getByRole('button',{name:'Suggest for tests with missing labels'}).click();await page.getByText('Queued 2 additional tests.',{exact:false}).waitFor();assert.deepEqual(batches,[{}]);assert.equal(writes.length,0,'bulk queue never approves');
    await page.getByRole('progressbar').waitFor();assert.equal(await page.getByRole('progressbar').getAttribute('value'),'2');
    await page.getByRole('button',{name:'Review this test'}).click();await page.getByText('He ___ every day.',{exact:false}).first().waitFor();
    await page.setViewportSize({width:1280,height:900});await page.screenshot({path:join(shots,'review-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:join(shots,'review-mobile.png'),fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.getByLabel('Labels to inspect',{exact:true}).selectOption('LOW_CONFIDENCE');await page.getByText('He ___ every day.',{exact:false}).first().waitFor();assert.ok(filters.includes('LOW_CONFIDENCE'));
    await page.getByRole('button',{name:'Suggest topics',exact:true}).click();assert.equal(suggested,1);
    await page.getByRole('button',{name:'Approve displayed labels'}).click();await page.getByRole('dialog').waitFor();assert.equal(writes.length,0);await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
    const first=page.locator('article').first();await first.getByLabel('Topic',{exact:true}).selectOption('topic2');assert.equal(await page.getByRole('button',{name:'Approve all pending labels in this test',exact:true}).isDisabled(),true);await first.getByRole('button',{name:'Approve',exact:true}).click();await page.getByText('Saved successfully.',{exact:true}).waitFor();assert.equal(writes[0][0].topicId,'topic2');
    await page.getByRole('button',{name:'Approve displayed labels'}).click();await page.getByRole('dialog').getByRole('button',{name:'Approve',exact:true}).click();await page.getByText('No labels match this filter.').waitFor();assert.equal(writes[1].length,1);
    await page.getByLabel('Status',{exact:true}).selectOption('APPROVED');await page.locator('article').first().getByRole('button',{name:'Reject',exact:true}).click();await page.getByText('Saved successfully.',{exact:true}).waitFor();assert.equal(writes.at(-1)[0].status,'REJECTED');
    for(const n of [3,4])labels.push({...labels[0],id:'label'+n,question_id:'q'+n,status:'SUGGESTED',confidence:.95});
    await page.getByRole('button',{name:'Approve all pending labels in this test',exact:true}).click();await page.getByRole('dialog').getByText('approve 2 pending labels for 2 questions',{exact:false}).waitFor();
    assert.equal(wholeApprovals.length,0);await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(labels.filter(l=>l.status==='SUGGESTED').length,2);
    await page.getByRole('button',{name:'Approve all pending labels in this test',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Approve',exact:true}).click();
    await page.getByText('Approved 2 labels for 2 questions in this test; skipped 0 invalid labels.',{exact:true}).waitFor();assert.deepEqual(wholeApprovals,[{revision:'a'.repeat(64)}]);assert.equal(labels.filter(l=>l.status==='SUGGESTED').length,0);
    await page.evaluate(()=>window.language('vi'));await page.getByRole('heading',{name:'Quản lý chủ đề',exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});
