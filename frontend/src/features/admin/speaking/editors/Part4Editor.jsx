import { Field } from '../../shared-test-builder/BuilderFields';
import ImageField from '../../shared-test-builder/ImageField';
import SpeakingPromptEditor from '../components/SpeakingPromptEditor';
import styles from './Part4Editor.module.css';
export default function Part4Editor({value,onChange}){return <><div className={styles.timing}><span>Preparation: <b>60 seconds</b></span><span>Combined response: <b>120 seconds</b></span></div><Field multiline maxWords={50} label="Topic" value={value.topic} onChange={topic=>onChange({...value,topic})}/><ImageField tall required label="Topic picture" value={value.imageUrl} onChange={imageUrl=>onChange({...value,imageUrl})}/><SpeakingPromptEditor questions={value.questions} timeLabel="One combined response" onChange={questions=>onChange({...value,questions})}/></>}
