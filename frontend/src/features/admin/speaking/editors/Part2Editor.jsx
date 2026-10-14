import { useUiTranslation } from "../../../../i18n/useUiTranslation.jsx";
import ImageField from '../../shared-test-builder/ImageField';
import SpeakingPromptEditor from '../components/SpeakingPromptEditor';
export default function Part2Editor({value,onChange}){
  const ui = useUiTranslation();return <><ImageField tall required label={ui("Picture shown to the candidate")} value={value.imageUrl} onChange={imageUrl=>onChange({...value,imageUrl})}/><SpeakingPromptEditor questions={value.questions} seconds={45} onChange={questions=>onChange({...value,questions})}/></>}
