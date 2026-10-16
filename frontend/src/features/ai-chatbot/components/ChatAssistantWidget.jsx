import { useCallback,useEffect,useRef,useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link,useLocation } from 'react-router-dom';
import { Check,Clipboard,History,MessageCircle,Plus,Send,Sparkles,Trash2,X,Pencil,ThumbsUp,ThumbsDown } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { chatRequest } from '../services/chatApi';
import { actionPath,chatAllowed,resultContext,safeSource } from '../services/chatPolicy';
import styles from './ChatAssistantWidget.module.css';

export default function ChatAssistantWidget() {
  const {user}=useAuth();const location=useLocation();
  if(!user||!chatAllowed(location.pathname))return null;
  return <ChatWidget key={user.id} context={resultContext(location.pathname,location.search)}/>;
}
function ChatWidget({context}) {
  const {t,i18n}=useTranslation();const tr=key=>t(`chat.${key}`);
  const [open,setOpen]=useState(false),[history,setHistory]=useState(false),[sessions,setSessions]=useState([]);
  const [active,setActive]=useState(null),[messages,setMessages]=useState([]),[draft,setDraft]=useState('');
  const [error,setError]=useState(''),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[enabled,setEnabled]=useState(false);
  const [page,setPage]=useState(1),[more,setMore]=useState(false),[messagePage,setMessagePage]=useState(1),[older,setOlder]=useState(false);
  const [replyingTo,setReplyingTo]=useState(undefined);
  const [rename,setRename]=useState(null),[title,setTitle]=useState('');
  const alive=useRef(true),activeRef=useRef(null),version=useRef(0),requests=useRef(new Set()),mutating=useRef(false),pendingSend=useRef(null);
  const scroller=useRef(null),follow=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;requests.current.forEach(c=>c.abort());};},[]);
  const request=useCallback(async(method,path,data)=>{
    const controller=new AbortController();requests.current.add(controller);
    try{return await chatRequest(method,path,data,controller.signal);}finally{requests.current.delete(controller);}
  },[]);
  const failure=e=>{if(alive.current&&e?.code!=='ERR_CANCELED')setError(e?.response?.data?.error?.code??'CHAT_NETWORK');};
  const list=useCallback(async(next=1)=>{
    const data=await request('GET',`/sessions?page=${next}`);if(!alive.current)return;
    setSessions(prev=>next===1?data.items:[...prev,...data.items.filter(s=>!prev.some(p=>p.id===s.id))]);setMore(data.hasMore);setPage(next);
  },[request]);
  const load=useCallback(async(id,next=1)=>{
    const v=version.current;const data=await request('GET',`/sessions/${id}/messages?page=${next}`);
    if(!alive.current||v!==version.current||activeRef.current!==id)return;
    setMessages(prev=>next===1?data.items:[...data.items.filter(m=>!prev.some(p=>p.id===m.id)),...prev]);setOlder(data.hasMore);setMessagePage(next);
  },[request]);
  useEffect(()=>{
    if(!open)return;let cancelled=false;setLoading(true);
    Promise.all([list(),request('GET','/status')]).then(([,s])=>{if(!cancelled)setEnabled(s.enabled);}).catch(failure).finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;};
  },[open,list,request]);
  useEffect(()=>{if(open&&follow.current&&scroller.current)scroller.current.scrollTop=scroller.current.scrollHeight;},[open,messages,busy]);
  const hasPending=messages.some(m=>m.status==='PENDING');
  useEffect(()=>{if(!open||!active||!hasPending||busy)return;const timer=setTimeout(()=>load(active).catch(failure),4000);return()=>clearTimeout(timer);},[open,active,hasPending,busy,messages,load]);
  useEffect(()=>{const close=e=>{if(e.key==='Escape')setOpen(false);};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close);},[]);
  const choose=async session=>{
    activeRef.current=session.id;version.current++;setActive(session.id);setMessages([]);setOlder(false);setDraft('');setHistory(false);setError('');pendingSend.current=null;follow.current=true;
    setLoading(true);try{await load(session.id);}catch(e){failure(e);}finally{if(alive.current)setLoading(false);}
  };
  const newChat=()=>{if(mutating.current)return;activeRef.current=null;version.current++;setActive(null);setMessages([]);setDraft('');setHistory(false);setOlder(false);setError('');pendingSend.current=null;};
  const mutate=async(fn,isReply=false)=>{
    if(mutating.current)return;mutating.current=true;setBusy(true);setError('');if(isReply)setReplyingTo(activeRef.current);
    try{await fn();}catch(e){failure(e);}finally{mutating.current=false;if(alive.current){setBusy(false);if(isReply)setReplyingTo(undefined);}}
  };
  const send=event=>{
    event?.preventDefault();const content=draft.trim();if(!content||!enabled||hasPending)return;
    mutate(async()=>{
      let id=activeRef.current;
      if(!id){
        const creating=pendingSend.current?.creating??crypto.randomUUID();
        pendingSend.current={creating,clientMessageId:pendingSend.current?.clientMessageId??crypto.randomUUID(),content};
        const session=await request('POST','/sessions',{id:creating,...(context??{})});if(!alive.current)return;
        id=session.id;activeRef.current=id;setActive(id);setReplyingTo(id);version.current++;setSessions(prev=>[session,...prev.filter(s=>s.id!==id)]);
      }
      const retry=pendingSend.current;
      const payload=retry?.content===content?{clientMessageId:retry.clientMessageId,content}:{clientMessageId:crypto.randomUUID(),content};
      pendingSend.current=payload;await request('POST',`/sessions/${id}/messages`,payload);if(!alive.current)return;
      pendingSend.current=null;if(activeRef.current===id){setDraft('');follow.current=true;await load(id);}await list();
    },true);
  };
  const retryMessage=id=>mutate(async()=>{const session=activeRef.current;await request('POST',`/sessions/${session}/messages/${id}/retry`);if(alive.current&&activeRef.current===session)await load(session);},true);
  const feedback=(message,value)=>mutate(async()=>{const id=activeRef.current;await request('PATCH',`/sessions/${id}/messages/${message.id}/feedback`,{feedback:message.feedback===value?0:value});if(alive.current&&activeRef.current===id)setMessages(prev=>prev.map(m=>m.id===message.id?{...m,feedback:m.feedback===value?null:value}:m));});
  const remove=session=>mutate(async()=>{await request('DELETE',`/sessions/${session.id}`);if(!alive.current)return;setSessions(prev=>prev.filter(s=>s.id!==session.id));if(activeRef.current===session.id){activeRef.current=null;version.current++;setActive(null);setMessages([]);setDraft('');pendingSend.current=null;}});
  const renameChat=event=>{event.preventDefault();mutate(async()=>{await request('PATCH',`/sessions/${rename}`,{title:title.trim()});if(!alive.current)return;setRename(null);await list();});};
  return <div className={styles.widget}>
    {open&&<section className={styles.panel} aria-label={tr('title')}>
      <header className={styles.header}>
        <span className={styles.headerIcon}><Sparkles size={19}/></span><div><strong>{tr('title')}</strong><small>{tr(enabled?'support':'disabled')}</small></div>
        <button onClick={()=>setHistory(v=>!v)} title={tr('history')} aria-label={tr('history')}><History size={19}/></button>
        <button onClick={newChat} disabled={busy} title={tr('new')} aria-label={tr('new')}><Plus size={20}/></button>
        <button onClick={()=>setOpen(false)} title={tr('close')} aria-label={tr('close')}><X size={20}/></button>
      </header>
      {history?<div className={styles.historyPanel}>
        <div className={styles.historyHeading}><strong>{tr('history')}</strong><button onClick={newChat} disabled={busy}><Plus size={16}/>{tr('new')}</button></div>
        <div className={styles.historyList}>
          {sessions.map(s=><div key={s.id} className={`${styles.historyItem} ${active===s.id?styles.activeHistoryItem:''}`}>
            <button className={styles.historyOpen} onClick={()=>choose(s)}><MessageCircle size={17}/><span><strong>{s.title==='New conversation'?tr('new'):s.title}</strong><small>{new Date(s.updatedAt).toLocaleString(i18n.language)}</small></span></button>
            <div><button disabled={busy} aria-label={tr('rename')} onClick={()=>{setRename(s.id);setTitle(s.title);}}><Pencil size={14}/></button><button disabled={busy} aria-label={tr('delete')} onClick={()=>remove(s)}><Trash2 size={14}/></button></div>
          </div>)}
          {!sessions.length&&!loading&&<p>{tr('emptyHistory')}</p>}{more&&<button onClick={()=>list(page+1).catch(failure)}>{tr('more')}</button>}
          {rename&&<form onSubmit={renameChat}><input aria-label={tr('rename')} value={title} onChange={e=>setTitle(e.target.value)} maxLength={200}/><button disabled={busy||!title.trim()}>{tr('save')}</button><button type="button" onClick={()=>setRename(null)}>{tr('cancel')}</button></form>}
          {error&&<p role="alert">{tr('error')}</p>}
        </div>
      </div>:<div className={styles.messages} ref={scroller} onScroll={()=>{const el=scroller.current;follow.current=el.scrollHeight-el.scrollTop-el.clientHeight<60;}}>
        {older&&<button onClick={()=>{follow.current=false;load(active,messagePage+1).catch(failure);}}>{tr('older')}</button>}
        {!messages.length&&!loading&&<div className={styles.welcome}><span><Sparkles size={22}/></span><h2>{tr('welcome')}</h2><p>{tr(context?'resultContext':'intro')}</p><div className={styles.suggestions}>{['grammar','stats','features'].map(k=><button key={k} onClick={()=>setDraft(tr(k))}>{tr(k)}</button>)}</div></div>}
        {loading&&<p role="status">{tr('loading')}</p>}
        {messages.map(m=><ChatMessage key={m.id} message={m} tr={tr} disabled={busy} onFeedback={v=>feedback(m,v)} onRetry={()=>retryMessage(m.id)} canRetry={m.id===messages.at(-1)?.id}/>)}
        {replyingTo!==undefined&&replyingTo===active&&!hasPending&&<TypingBubble label={tr('thinking')}/>}
      </div>}
      {!history&&<>
        {error&&<div className={styles.notice} role="alert">{tr(['CHAT_DISABLED','CHAT_CONFIG_INVALID'].includes(error)?'disabled':error==='CHAT_RATE_LIMIT'?'rateLimit':'error')}<button onClick={()=>active?load(active).then(()=>setError('')).catch(failure):list().catch(failure)}>{tr('refresh')}</button></div>}
        <form className={styles.composer} onSubmit={send}><textarea aria-label={tr('input')} placeholder={tr('input')} value={draft} maxLength={4000} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}}}/><button disabled={busy||hasPending||!enabled||!draft.trim()} aria-label={tr('send')}><Send size={17}/></button></form>
        <small className={styles.disclaimer}>{tr('privacy')}</small>
      </>}
    </section>}
    <button className={`${styles.launcher} ${open?styles.launcherOpen:''}`} onClick={()=>setOpen(v=>!v)} aria-label={tr(open?'close':'title')} aria-expanded={open}>{open?<X size={22}/>:<><MessageCircle size={23}/><span className={styles.launcherLabel}>{tr('title')}</span></>}</button>
  </div>;
}
function ChatMessage({message:m,tr,onFeedback,onRetry,disabled,canRetry}) {
  const [copied,setCopied]=useState(false);
  const copy=async()=>{try{await navigator.clipboard.writeText(m.content);setCopied(true);}catch{setCopied(false);}};
  if(m.role==='assistant'&&m.status==='PENDING')return <TypingBubble label={tr('thinking')}/>;
  return <article className={`${styles.messageRow} ${m.role==='user'?styles.userRow:''}`}>
    {m.role!=='user'&&<span className={styles.avatar}><Sparkles size={14}/></span>}
    <div className={styles.messageBody}><div className={`${styles.message} ${m.role==='user'?styles.userMessage:styles.assistantMessage}`}>{m.content||tr(m.status==='PENDING'?'thinking':'failed')}</div>
      {m.role==='assistant'&&m.status==='FAILED'&&canRetry&&<button disabled={disabled} onClick={onRetry}>{tr('retry')}</button>}
      {m.role==='assistant'&&m.status==='COMPLETED'&&<>
        <div className={styles.messageTools}><button aria-label={tr('copy')} onClick={copy}>{copied?<Check size={13}/>:<Clipboard size={13}/>}</button><button disabled={disabled} aria-label={tr('helpful')} aria-pressed={m.feedback===1} onClick={()=>onFeedback(1)}><ThumbsUp size={13}/></button><button disabled={disabled} aria-label={tr('unhelpful')} aria-pressed={m.feedback===-1} onClick={()=>onFeedback(-1)}><ThumbsDown size={13}/></button></div>
        {(m.citations??[]).map(s=>safeSource(s.url)?<a className={styles.source} key={s.id} href={safeSource(s.url)} target="_blank" rel="noopener noreferrer">{s.title}</a>:<span key={s.id}>{s.title}</span>)}
        {(m.actions??[]).map((a,i)=>actionPath(a)?<Link className={styles.action} key={`${a.code}-${i}`} to={actionPath(a)}>{tr(`actions.${a.code}`)}</Link>:null)}
      </>}
    </div>
  </article>;
}

function TypingBubble({label}) {
  return <div className={styles.messageRow} role="status" aria-label={label}>
    <span className={styles.avatar} aria-hidden="true"><Sparkles size={14}/></span>
    <div className={`${styles.typing} ${styles.assistantMessage}`} aria-hidden="true"><i/><i/><i/></div>
  </div>;
}
