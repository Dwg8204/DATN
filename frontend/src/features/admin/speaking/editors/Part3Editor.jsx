import ImageField from '../../shared-test-builder/ImageField';
import SpeakingPromptEditor from '../components/SpeakingPromptEditor';
import styles from './Part3Editor.module.css';
export default function Part3Editor({value,onChange}){const update=(index,imageUrl)=>onChange({...value,imageUrls:value.imageUrls.map((item,current)=>current===index?imageUrl:item)});return <><div className={styles.images}><ImageField required label="Picture 1" value={value.imageUrls[0]} onChange={url=>update(0,url)}/><ImageField required label="Picture 2" value={value.imageUrls[1]} onChange={url=>update(1,url)}/></div><SpeakingPromptEditor questions={value.questions} seconds={45} onChange={questions=>onChange({...value,questions})}/></>}
