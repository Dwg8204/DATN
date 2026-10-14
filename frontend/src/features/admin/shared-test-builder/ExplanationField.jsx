import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { EXPLANATION_WORD_LIMIT } from './explanationValidation';
import { Field } from './BuilderFields';
export default function ExplanationField({ value, onChange }) {
  const ui = useUiTranslation();
  return <details style={{marginTop:14,minWidth:0}}><summary style={{cursor:'pointer',fontWeight:600,color:'#a91d31'}}>{ ui("Explanation") + ' ' }{value?.trim() ? ui("· Added") : ui("· Optional")}</summary><Field label={ui("Explain why this answer is correct")} multiline maxWords={EXPLANATION_WORD_LIMIT} value={value || ''} onChange={onChange} /></details>;
}
