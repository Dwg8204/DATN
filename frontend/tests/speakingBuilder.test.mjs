import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpeakingDraft } from '../src/features/admin/speaking/data/speakingTestModel.js';
import { validateSpeakingPart, validateSpeakingTest } from '../src/features/admin/speaking/validation/speakingValidation.js';
import { deleteStoredSpeakingTest, getStoredSpeakingTests, saveStoredSpeakingTest } from '../src/features/admin/speaking/data/speakingTestStorage.js';

const image = 'data:image/jpeg;base64,QQ==';
function complete(mode='full'){const draft=createSpeakingDraft(mode);draft.details.title='Speaking Practice';for(const number of [1,2,3,4])draft.parts[number].questions=draft.parts[number].questions.map((question,index)=>({...question,text:`Part ${number} question ${index+1}`}));draft.parts[2].imageUrl=image;draft.parts[3].imageUrls=[image,'data:image/jpeg;base64,Qg=='];draft.parts[4].topic='Technology in daily life';draft.parts[4].imageUrl=image;return draft}

test('empty Speaking draft is rejected',()=>assert.ok(validateSpeakingTest(createSpeakingDraft()).length));
test('each Speaking part and full mode accepts its fixed schema',()=>{for(const mode of ['part1','part2','part3','part4','full'])assert.deepEqual(validateSpeakingTest(complete(mode)),[])});
test('part-only validation ignores incomplete unselected parts',()=>assert.deepEqual(validateSpeakingTest(complete('part1')),[]));
test('each part requires exactly three unique questions',()=>{const draft=complete();draft.parts[1].questions.pop();assert.ok(validateSpeakingPart(1,draft.parts[1])[0].includes('exactly three'));const duplicate=complete();duplicate.parts[2].questions[1].text=duplicate.parts[2].questions[0].text;assert.ok(validateSpeakingPart(2,duplicate.parts[2])[0].includes('must not be duplicated'))});
test('picture parts enforce their Aptis image structure',()=>{const p2=complete();p2.parts[2].imageUrl='';assert.ok(validateSpeakingPart(2,p2.parts[2])[0].includes('one valid picture'));const p3=complete();p3.parts[3].imageUrls=[image,image];assert.ok(validateSpeakingPart(3,p3.parts[3])[0].includes('must be different'));const p4=complete();p4.parts[4].topic='';assert.ok(validateSpeakingPart(4,p4.parts[4])[0].includes('topic'))});
test('storage creates, updates and deletes Speaking tests',()=>{const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};globalThis.window={dispatchEvent:()=>{}};const saved=saveStoredSpeakingTest(complete('part3'));assert.equal(saved.section,'Part 3');assert.equal(getStoredSpeakingTests().length,1);saveStoredSpeakingTest({...saved,details:{...saved.details,title:'Edited Speaking'}});assert.equal(getStoredSpeakingTests()[0].name,'Edited Speaking');deleteStoredSpeakingTest(saved.id);assert.equal(getStoredSpeakingTests().length,0)});
