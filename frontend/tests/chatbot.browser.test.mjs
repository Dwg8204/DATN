import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';

test('chat sessions, feedback, retry, ownership boundary and exam visibility',async()=>{
  const bundle=await build({stdin:{resolveDir:fileURLToPath(new URL('..',import.meta.url)),loader:'jsx',contents:`
    import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter,useNavigate,useLocation} from 'react-router-dom';
    import i18n from './src/i18n/index.js';import Chat from './src/features/ai-chatbot/components/ChatAssistantWidget.jsx';
    i18n.changeLanguage('en');window.chatUser={id:'alice'};
    function App(){const[n,setN]=useState(0);window.rerender=()=>setN(n+1);window.go=useNavigate();window.chatPath=useLocation().pathname+useLocation().search;return <Chat/>;}
    createRoot(document.getElementById('root')).render(<MemoryRouter><App/></MemoryRouter>);`},
    plugins:[{name:'auth',setup(b){b.onLoad({filter:/[\\/]context[\\/]AuthContext.jsx$/},()=>({contents:'export const useAuth=()=>({user:window.chatUser});',loader:'js'}));}}],
    bundle:true,write:false,outfile:'chat.js',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','import.meta.env':'{}'}});
  const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
  try{
    const page=await browser.newPage({viewport:{width:390,height:850}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const sessions=Array.from({length:30},(_,i)=>({id:'older-'+i,title:'Older conversation '+i,updatedAt:'2026-10-16T00:00:00Z'})),messages=new Map(sessions.map(s=>[s.id,[]]));let failNext=false,failRename=false;let releaseReply;let holdReply=new Promise(resolve=>{releaseReply=resolve;});
    await page.route('**/*',async route=>{
      const r=route.request(),url=new URL(r.url()),method=r.method(),path=url.pathname.replace('/api/v1/chatbot','');
      const ok=data=>route.fulfill({json:{data}});
      if(url.hostname==='chat-ui.test')return route.fulfill({contentType:'text/html',body:'<html><body><div id="root"></div></body></html>'});
      if(path==='/status')return ok({enabled:true});
      if(path==='/sessions'&&method==='GET')return ok({items:sessions,hasMore:false});
      if(path==='/sessions'&&method==='POST'){const d=r.postDataJSON();const s={...d,title:'New conversation',updatedAt:new Date().toISOString()};sessions.unshift(s);messages.set(d.id,[]);return ok(s);}
      const [, ,id,,messageId,action]=path.split('/');const list=messages.get(id);
      if(path.endsWith('/messages')&&method==='GET')return ok({items:list,hasMore:false});
      if(path.endsWith('/messages')&&method==='POST'){
        if(holdReply)await holdReply;
        const d=r.postDataJSON();const reply={id:`reply-${list.length}`,role:'assistant',status:failNext?'FAILED':'COMPLETED',content:failNext?'':`Answer: ${d.content}`,citations:[],actions:sessions.find(s=>s.id===id).insightId?[{code:'OPEN_STUDY_PLAN'},{code:'OPEN_MISTAKE_REVIEW'}]:[{code:'OPEN_NOTEBOOK'}]};failNext=false;
        list.push({id:d.clientMessageId,role:'user',content:d.content,status:'COMPLETED'},reply);sessions.find(s=>s.id===id).title=d.content;return ok(reply);
      }
      if(action==='feedback'){const m=list.find(m=>m.id===messageId);m.feedback=r.postDataJSON().feedback;return ok(m);}
      if(action==='retry'){const m=list.find(m=>m.id===messageId);m.status='COMPLETED';m.content='Recovered reply';return ok(m);}
      if(method==='PATCH'){if(failRename){failRename=false;return route.fulfill({status:500,json:{error:{code:'TEST_ERROR'}}});}sessions.find(s=>s.id===id).title=r.postDataJSON().title;return ok({id});}
      if(method==='DELETE'){sessions.splice(sessions.findIndex(s=>s.id===id),1);return ok({id});}
      return route.abort();
    });
    await page.goto('https://chat-ui.test/');await page.addStyleTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.css')).text});await page.addScriptTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.js')).text});
    const launcher=page.getByRole('button',{name:'AptiMate Assistant',exact:true});
    await launcher.waitFor();assert.equal(await launcher.locator('svg').count(),1);
    const petBox=await launcher.boundingBox();assert.ok(petBox.width>=44&&petBox.x+petBox.width<=390);
    assert.ok(await launcher.locator('svg').evaluate(svg=>[...svg.querySelectorAll('*')].some(el=>getComputedStyle(el).animationName!=='none')));
    await launcher.hover();
    if(process.env.CHATBOT_PET_PREVIEW)await page.screenshot({path:process.env.CHATBOT_PET_PREVIEW,clip:{x:70,y:640,width:320,height:200}});
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.ok(await launcher.locator('svg').evaluate(svg=>[...svg.querySelectorAll('*')].every(el=>getComputedStyle(el).animationName==='none')));
    await page.emulateMedia({reducedMotion:'no-preference'});
    await launcher.focus();await page.keyboard.press('Enter');
    assert.equal(await page.getByRole('region',{name:'AptiMate Assistant'}).count(),1);
    const ask=async text=>{await page.getByLabel('Type a question…').fill(text);await page.getByRole('button',{name:'Send',exact:true}).click();};
    await ask('First session');
    const typing=page.getByRole('status',{name:'Preparing a reply…'});await typing.waitFor();assert.equal(await typing.locator('i').count(),3);assert.equal(await typing.innerText(),'');
    assert.notEqual(await typing.locator('i').first().evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await typing.locator('i').first().evaluate(el=>getComputedStyle(el).animationName),'none');await page.emulateMedia({reducedMotion:'no-preference'});
    releaseReply();holdReply=null;await page.getByText('Answer: First session',{exact:true}).waitFor();
    assert.equal(await typing.count(),0);
    const notebook=page.getByRole('link',{name:'Open vocabulary notebook'});assert.equal(await notebook.getAttribute('href'),'/dictation?mode=notebook');await notebook.click();await page.waitForFunction(()=>window.chatPath==='/dictation?mode=notebook');
    await page.getByRole('button',{name:'Helpful',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[aria-label="Helpful"]').getAttribute('aria-pressed')==='true');
    await page.getByRole('button',{name:'New conversation',exact:true}).click();await ask('Second session');await page.getByText('Answer: Second session',{exact:true}).waitFor();
    assert.equal(await page.getByText('Answer: First session',{exact:true}).count(),0);
    await page.getByRole('button',{name:'Chat history',exact:true}).click();await page.getByRole('button',{name:/First session/}).click();await page.getByText('Answer: First session',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Chat history',exact:true}).click();
    const renameButtons=page.getByRole('button',{name:'Rename',exact:true});
    assert.equal(await renameButtons.count(),32);
    const editBox=await renameButtons.first().boundingBox(),deleteBox=await page.getByRole('button',{name:'Delete conversation',exact:true}).first().boundingBox();
    assert.ok(editBox.width>=32&&deleteBox.x-(editBox.x+editBox.width)>=5);
    await renameButtons.first().click();
    const renameInput=page.getByRole('textbox',{name:'Rename',exact:true});
    await renameInput.waitFor();assert.ok(await renameInput.evaluate(el=>document.activeElement===el));
    const editForm=renameInput.locator('xpath=ancestor::form');
    assert.match(await editForm.evaluate(el=>el.parentElement.className),/historyItem/);
    await renameInput.fill('Discard this');await renameInput.press('Escape');
    assert.equal(await renameInput.count(),0);assert.equal(await page.getByRole('region',{name:'AptiMate Assistant'}).count(),1);
    await renameButtons.first().click();await renameInput.fill('');assert.ok(await page.getByRole('button',{name:'Save',exact:true}).isDisabled());
    await renameInput.fill('A long conversation title '.repeat(6));
    await page.setViewportSize({width:320,height:850});await page.evaluate(()=>document.documentElement.dataset.theme='dark');
    assert.ok(await editForm.evaluate(el=>el.scrollWidth<=el.clientWidth));
    if(process.env.CHATBOT_HISTORY_PREVIEW)await page.getByRole('region',{name:'AptiMate Assistant'}).screenshot({path:process.env.CHATBOT_HISTORY_PREVIEW});
    await page.setViewportSize({width:390,height:850});
    await renameInput.fill('Renamed chat');failRename=true;await renameInput.press('Enter');
    await editForm.getByRole('alert').waitFor();assert.equal(await renameInput.inputValue(),'Renamed chat');
    await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByRole('button',{name:/Renamed chat/}).waitFor();
    assert.equal(await renameButtons.count(),32);
    await page.getByRole('button',{name:/Renamed chat/}).click();
    failNext=true;await ask('Try failure');await page.getByRole('button',{name:'Retry reply'}).click();await page.getByText('Recovered reply',{exact:true}).waitFor();
    await page.evaluate(()=>document.documentElement.dataset.theme='dark');
    const panel=await page.getByRole('region',{name:'AptiMate Assistant'}).boundingBox();assert.ok(panel.x>=0&&panel.x+panel.width<=391);
    await page.evaluate(()=>window.go('/writing/test'));assert.equal(await page.getByRole('button',{name:'AptiMate Assistant',exact:true}).count(),0);
    await page.evaluate(()=>window.go('/writing/result'));await page.getByRole('button',{name:'AptiMate Assistant',exact:true}).waitFor();
    const reportA='00000000-0000-4000-8000-000000000001',reportB='00000000-0000-4000-8000-000000000002';
    await page.evaluate(id=>window.go(`/profile/reports/${id}?chat=1`),reportA);
    await page.getByText('Discussing a saved report.',{exact:false}).waitFor();
    await ask('Report A question');await page.getByText('Answer: Report A question',{exact:true}).waitFor();
    const sessionA=sessions[0].id;assert.equal(sessions[0].insightId,reportA);assert.equal(sessions[0].attemptId,undefined);
    assert.equal(await page.getByRole('link',{name:'Open study plan',exact:true}).getAttribute('href'),'/profile/dashboard');
    await page.getByRole('link',{name:'Open study plan',exact:true}).click();await page.waitForFunction(()=>window.chatPath==='/profile/dashboard');
    await page.evaluate(id=>window.go(`/profile/reports/${id}?chat=1`),reportB);
    await ask('Report B question');await page.getByText('Answer: Report B question',{exact:true}).waitFor();
    assert.equal(sessions[0].insightId,reportB);assert.notEqual(sessions[0].id,sessionA);
    await page.getByRole('link',{name:'Open mistake review',exact:true}).click();await page.waitForFunction(()=>window.chatPath==='/profile/mistakes');
    await page.getByRole('button',{name:'AptiMate Assistant',exact:true}).click();
    await page.getByRole('button',{name:'Chat history',exact:true}).click();
    await page.getByRole('button',{name:/Report A question/}).click();await page.getByText('Answer: Report A question',{exact:true}).waitFor();
    assert.equal(await page.getByRole('link',{name:'View report',exact:true}).getAttribute('href'),`/profile/reports/${reportA}`);
    await ask('Follow up on A');await page.getByText('Answer: Follow up on A',{exact:true}).waitFor();
    assert.equal(messages.get(sessionA).at(-1).content,'Answer: Follow up on A');
    await page.evaluate(()=>{window.chatUser=null;window.rerender();});assert.equal(await page.getByRole('button',{name:'AptiMate Assistant',exact:true}).count(),0);
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});
