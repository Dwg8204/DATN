import { getStoredSpeakingTest, getStoredSpeakingTests } from '../../admin/speaking/data/speakingTestStorage';
import { PART1_QUESTIONS } from '../data/part1SpeakingMockData';
import { PART2_QUESTIONS } from '../data/part2SpeakingMockData';
import { PART3_QUESTIONS } from '../data/part3SpeakingMockData';
import { PART4_QUESTIONS } from '../data/part4SpeakingMockData';
import picture1 from '../assets/picture.webp';
import picture2 from '../assets/picture2.webp';
import picture3 from '../assets/picture3.webp';
export function getSpeakingTestParts(id){const test=getStoredSpeakingTest(id);if(!test)return{part1:{questions:PART1_QUESTIONS},part2:{questions:PART2_QUESTIONS,imageUrl:picture1},part3:{questions:PART3_QUESTIONS,imageUrls:[picture1,picture2]},part4:{questions:PART4_QUESTIONS,imageUrl:picture3,topic:'Speak on a given topic'}};return{part1:test.parts[1],part2:test.parts[2],part3:test.parts[3],part4:test.parts[4]}}
export function getAdminSpeakingList(){return getStoredSpeakingTests().map(test=>({id:test.id,title:test.title,desc:'Speaking practice test',part:test.mode==='full'?'Full Speaking Test':test.mode.replace('part','Part '),tabId:test.mode,thumbnail:test.details.pictureUrl||test.parts[2]?.imageUrl||'https://placehold.co/157x79?text=Speaking',status:'Not Started'}))}
