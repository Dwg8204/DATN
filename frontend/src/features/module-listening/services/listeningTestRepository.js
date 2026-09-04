import { getStoredListeningTest, getStoredListeningTests } from '../../admin/listening/data/listeningTestStorage';
import { PART1_QUESTIONS } from '../data/part1MockData';
import { PART2_DATA } from '../data/part2MockData';
import { PART3_DATA } from '../data/part3MockData';
import { PART4_QUESTIONS } from '../data/part4MockData';
const adaptQuestion=question=>({...question,answer:question.correctAnswer??question.answer});
export function getListeningTestParts(id){const test=getStoredListeningTest(id);if(!test)return{part1:PART1_QUESTIONS,part2:PART2_DATA,part3:PART3_DATA,part4:PART4_QUESTIONS};return{part1:test.parts[1].questions.map(adaptQuestion),part2:test.parts[2],part3:{...test.parts[3],answers:Object.fromEntries(test.parts[3].statements.map(statement=>[statement.id,statement.answer]))},part4:test.parts[4].recordings.map(recording=>({...recording,subQuestions:recording.subQuestions.map(adaptQuestion) }))}}
export function getAdminListeningList(){return getStoredListeningTests().map(test=>({id:test.id,title:test.title,desc:'Listening practice test',part:test.mode==='full'?'Full Listening Test':test.mode.replace('part','Part '),tabId:test.mode,thumbnail:test.details.pictureUrl||'https://placehold.co/157x79?text=Listening',status:'Not Started'}))}
