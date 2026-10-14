import { useUiTranslation } from "../../../../i18n/useUiTranslation.jsx";
import { Field } from '../../shared-test-builder/BuilderFields';
import ImageField from '../../shared-test-builder/ImageField';
import SpeakingPromptEditor from '../components/SpeakingPromptEditor';
import styles from './Part4Editor.module.css';
export default function Part4Editor({value,onChange}){
  const ui = useUiTranslation();return <><div className={styles.timing}><span>{ ui("Preparation:") + ' ' }<b>{ui("60 seconds")}</b></span><span>{ ui("Combined response:") + ' ' }<b>{ui("120 seconds")}</b></span></div><Field multiline maxWords={50} label={ui("Topic")} value={value.topic} onChange={topic=>onChange({...value,topic})}/><ImageField tall required label={ui("Topic picture")} value={value.imageUrl} onChange={imageUrl=>onChange({...value,imageUrl})}/><SpeakingPromptEditor questions={value.questions} timeLabel="One combined response" showGuidance={false} onChange={questions=>onChange({...value,questions})}/><Field multiline maxWords={350} label={ui("Combined sample response · Optional")} value={value.sampleAnswer||''} onChange={sampleAnswer=>onChange({...value,sampleAnswer})}/><Field multiline maxWords={180} label={ui("Combined answer guidance · Optional")} value={value.explanation||''} onChange={explanation=>onChange({...value,explanation})}/></>}
