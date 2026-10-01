import SpeakingPromptEditor from '../components/SpeakingPromptEditor';
export default function Part1Editor({value,onChange}){return <SpeakingPromptEditor questions={value.questions} seconds={30} onChange={questions=>onChange({...value,questions})}/>}
