export function chatAllowed(path) {
  return !/^\/(?:login|signup|forgot-password|admin)(?:\/|$)/.test(path)
    && !/^\/(?:writing|reading|listening|speaking|grammar-vocab)\/(?:test|introduction)(?:\/|$)/.test(path);
}
export function resultContext(path,search) {
  const report = /^\/profile\/reports\/([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})$/i.exec(path);
  if(report)return {insightId:report[1]};
  if(!/\/(?:result|result-detail|detail-result)$/.test(path) && path !== '/profile/mistakes')return null;
  const id=new URLSearchParams(search).get('attemptId');
  const key = new URLSearchParams(search).get('questionKey');
  return id&&/^[\da-f-]{36}$/i.test(id)?{attemptId:id,...(path === '/profile/mistakes' && /^p[1-4]:[qs]\d{1,3}$/.test(key ?? '') ? {questionKey:key} : {})}:null;
}
export function actionPath(action) {
  const paths={OPEN_WRITING_PRACTICE:'/writing/practice',OPEN_READING_PRACTICE:'/reading/practice',OPEN_LISTENING_PRACTICE:'/listening/practice',OPEN_SPEAKING_PRACTICE:'/speaking/practice',OPEN_GRAMMAR_PRACTICE:'/grammar-vocab/practice',OPEN_NOTEBOOK:'/dictation?mode=notebook',OPEN_DICTATION:'/dictation',OPEN_STUDY_PLAN:'/profile/dashboard',OPEN_MISTAKE_REVIEW:'/profile/mistakes'};
  if(paths[action.code])return paths[action.code];
  const skills={WRITING:'writing',READING:'reading',LISTENING:'listening',SPEAKING:'speaking',GRAMMAR_VOCAB:'grammar-vocab'};
  if(action.code==='REVIEW_ATTEMPT'&&skills[action.component]&&/^[\da-f-]{36}$/i.test(action.attemptId??''))return `/${skills[action.component]}/result?attemptId=${encodeURIComponent(action.attemptId)}${action.purpose==='PRACTICE'?'&practice=true':''}`;
  return null;
}
export function safeSource(url) {try{const u=new URL(url);return u.protocol==='https:'?u.href:null;}catch{return null;}}
