import ImageField from '../../shared-test-builder/ImageField';
import styles from './SpeakingAnswerPreview.module.css';
const Questions=({questions,seconds})=><div className={styles.questions}>{questions.map((question,index)=><article key={question.id}><span>{index+1}</span><p>{question.text}</p><small>{seconds}</small></article>)}</div>;
export default function SpeakingAnswerPreview({test,part}){const data=test.parts[part];return <section className={styles.preview}>
  {part===4&&<div className={styles.topic}><b>Topic</b><p>{data.topic}</p><span>60 seconds preparation · 120 seconds response</span></div>}
  {part===2&&<ImageField readOnly label="Candidate picture" value={data.imageUrl}/>} 
  {part===3&&<div className={styles.images}>{data.imageUrls.map((url,index)=><ImageField readOnly key={index} label={`Candidate picture ${index+1}`} value={url}/>)}</div>}
  {part===4&&<ImageField readOnly label="Topic picture" value={data.imageUrl}/>} 
  <Questions questions={data.questions} seconds={part===1?'30 seconds':part===4?'Combined 120-second response':'45 seconds'}/>
</section>}
