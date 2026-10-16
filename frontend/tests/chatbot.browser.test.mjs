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
    const sessions=[],messages=new Map();let failNext=false;let releaseReply;let holdReply=new Promise(resolve=>{releaseReply=resolve;});
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
        const d=r.postDataJSON();const reply={id:`reply-${list.length}`,role:'assistant',status:failNext?'FAILED':'COMPLETED',content:failNext?'':`Answer: ${d.content}`,citations:[],actions:[{code:'OPEN_NOTEBOOK'}]};failNext=false;
        list.push({id:d.clientMessageId,role:'user',content:d.content,status:'COMPLETED'},reply);sessions.find(s=>s.id===id).title=d.content;return ok(reply);
      }
      if(action==='feedback'){const m=list.find(m=>m.id===messageId);m.feedback=r.postDataJSON().feedback;return ok(m);}
      if(action==='retry'){const m=list.find(m=>m.id===messageId);m.status='COMPLETED';m.content='Recovered reply';return ok(m);}
      if(method==='PATCH'){sessions.find(s=>s.id===id).title=r.postDataJSON().title;return ok({id});}
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
    await page.getByRole('button',{name:'Chat history',exact:true}).click();await page.getByRole('button',{name:'Rename',exact:true}).first().click();await page.getByRole('textbox',{name:'Rename',exact:true}).fill('Renamed chat');await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByRole('button',{name:/Renamed chat/}).click();
    failNext=true;await ask('Try failure');await page.getByRole('button',{name:'Retry reply'}).click();await page.getByText('Recovered reply',{exact:true}).waitFor();
    await page.evaluate(()=>document.documentElement.dataset.theme='dark');
    const panel=await page.getByRole('region',{name:'AptiMate Assistant'}).boundingBox();assert.ok(panel.x>=0&&panel.x+panel.width<=391);
    await page.evaluate(()=>window.go('/writing/test'));assert.equal(await page.getByRole('button',{name:'AptiMate Assistant',exact:true}).count(),0);
    await page.evaluate(()=>window.go('/writing/result'));await page.getByRole('button',{name:'AptiMate Assistant',exact:true}).waitFor();
    await page.evaluate(()=>{window.chatUser=null;window.rerender();});assert.equal(await page.getByRole('button',{name:'AptiMate Assistant',exact:true}).count(),0);
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});
