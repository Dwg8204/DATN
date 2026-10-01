import { EXPLANATION_WORD_LIMIT } from './explanationValidation';
import { Field } from './BuilderFields';
export default function ExplanationField({ value, onChange }) {
  return <details style={{marginTop:14,minWidth:0}}><summary style={{cursor:'pointer',fontWeight:600,color:'#a91d31'}}>Explanation {value?.trim() ? '· Added' : '· Optional'}</summary><Field label="Explain why this answer is correct" multiline maxWords={EXPLANATION_WORD_LIMIT} value={value || ''} onChange={onChange} /></details>;
}
