import ImageField from '../../shared-test-builder/ImageField';
import styles from './SpeakingAnswerPreview.module.css';
import RichTextContent from '../../../../components/common/RichTextContent';

const Guidance = ({ sampleAnswer, explanation }) => !sampleAnswer && !explanation ? null : <div className={styles.guidance}>
  {sampleAnswer && <div><strong>Sample response</strong><RichTextContent value={sampleAnswer}/></div>}
  {explanation && <div><strong>Answer guidance</strong><RichTextContent value={explanation}/></div>}
</div>;

const Questions=({questions,seconds,showGuidance=true})=><div className={styles.questions}>{questions.map((question,index)=><article key={question.id}>
  <span>{index+1}</span><div className={styles.questionBody}><RichTextContent value={question.text}/>
    {showGuidance && <Guidance sampleAnswer={question.sampleAnswer} explanation={question.explanation}/>}</div><small>{seconds}</small>
</article>)}</div>;

export default function SpeakingAnswerPreview({test,part}){const data=test.parts[part];return <section className={styles.preview}>
  {part===4&&<div className={styles.topic}><b>Topic</b><p>{data.topic}</p><span>60 seconds preparation · 120 seconds response</span></div>}
  {part===2&&<ImageField readOnly label="Candidate picture" value={data.imageUrl}/>} 
  {part===3&&<div className={styles.images}>{data.imageUrls.map((url,index)=><ImageField readOnly key={index} label={`Candidate picture ${index+1}`} value={url}/>)}</div>}
  {part===4&&<ImageField readOnly label="Topic picture" value={data.imageUrl}/>} 
  <Questions questions={data.questions} showGuidance={part!==4} seconds={part===1?'30 seconds':part===4?'Combined 120-second response':'45 seconds'}/>
  {part===4&&<Guidance sampleAnswer={data.sampleAnswer} explanation={data.explanation}/>}
</section>}
