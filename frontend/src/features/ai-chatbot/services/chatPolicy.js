export function chatAllowed(path) {
  return !/^\/(?:login|signup|forgot-password|admin)(?:\/|$)/.test(path)
    && !/^\/(?:writing|reading|listening|speaking|grammar-vocab)\/(?:test|introduction)(?:\/|$)/.test(path);
}
export function resultContext(path,search) {
  if(!/\/(?:result|result-detail|detail-result)$/.test(path))return null;
  const id=new URLSearchParams(search).get('attemptId');
  return id&&/^[\da-f-]{36}$/i.test(id)?{attemptId:id}:null;
}
export function actionPath(action) {
  const paths={OPEN_WRITING_PRACTICE:'/writing/practice',OPEN_READING_PRACTICE:'/reading/practice',OPEN_LISTENING_PRACTICE:'/listening/practice',OPEN_SPEAKING_PRACTICE:'/speaking/practice',OPEN_GRAMMAR_PRACTICE:'/grammar-vocab/practice',OPEN_NOTEBOOK:'/dictation?mode=notebook',OPEN_DICTATION:'/dictation'};
  if(paths[action.code])return paths[action.code];
  const skills={WRITING:'writing',READING:'reading',LISTENING:'listening',SPEAKING:'speaking',GRAMMAR_VOCAB:'grammar-vocab'};
  if(action.code==='REVIEW_ATTEMPT'&&skills[action.component]&&/^[\da-f-]{36}$/i.test(action.attemptId??''))return `/${skills[action.component]}/result?attemptId=${encodeURIComponent(action.attemptId)}${action.purpose==='PRACTICE'?'&practice=true':''}`;
  return null;
}
export function safeSource(url) {try{const u=new URL(url);return u.protocol==='https:'?u.href:null;}catch{return null;}}
