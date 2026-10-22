import { useSearchParams } from 'react-router-dom';
import styles from './AssessmentModelView.module.css';

// Both sources render the same result pages. Only their data adapters differ.
export default function AssessmentModelView({ children }) {
  const [params,setParams]=useSearchParams();
  const provider=params.get('model')==='groq'?'groq':'gemini';
  return <><nav className={styles.switcher} aria-label="Mô hình chấm bài">
    {['gemini','groq'].map(model=><button key={model} type="button" aria-pressed={provider===model}
      onClick={()=>setParams(previous=>{const next=new URLSearchParams(previous);next.set('model',model);return next;})}>
      {model==='gemini'?'Gemini · Kết quả chính':'Groq · Tham khảo'}</button>)}
  </nav>{children}</>;
}
