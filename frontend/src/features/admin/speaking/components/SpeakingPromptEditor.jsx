import { Field } from '../../shared-test-builder/BuilderFields';
import styles from './SpeakingPromptEditor.module.css';
import { useRef } from 'react';
import CollapsibleGroup, { CollapsibleToolbar } from '../../shared-test-builder/CollapsibleGroup';
export default function SpeakingPromptEditor({questions,onChange,seconds,timeLabel}){const scopeRef=useRef(null);return <div className={styles.list} ref={scopeRef}><CollapsibleToolbar scopeRef={scopeRef}/>{questions.map((question,index)=><CollapsibleGroup title={`Question ${index+1}`} summary={question.text||timeLabel||`${seconds} seconds`} status={question.text?.trim()?'Complete':'Incomplete'} defaultOpen={index===0} key={question.id}><section className={styles.prompt}><Field multiline maxWords={80} label="Question content" value={question.text} onChange={text=>onChange(questions.map((item,current)=>current===index?{...item,text}:item))}/></section></CollapsibleGroup>)}</div>}
