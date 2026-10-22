import test from 'node:test';
import assert from 'node:assert/strict';
import { applyReferenceSummary, applyReferencePart, referenceSpeakingPresentation } from './referenceAssessmentPresentation.js';

const primary={component:'SPEAKING',scope:'FULL_SKILL',gradingStatus:'COMPLETED',assessmentRevision:8,score:45,estimatedCefr:'B2',
  result:{method:'AI',score:45,maxScore:50,parts:[{partNumber:1,score:45}],
    speaking:{estimatedCefr:'B2'},items:[{key:'q',partNumber:1,selectedAnswer:{kind:'AUDIO',mediaKey:'recording'},assessment:{feedback:'GEMINI ONLY'}}]}};
const reference={status:'COMPLETED',enabled:true,revision:'revision',model:'openai/gpt-oss-120b',result:{speaking:{
  summary:'GROQ OVERALL',inputs:[{key:'q',partNumber:1,recorded:true,transcript:'Hello.'}],
  responses:[{key:'q',grammarVocabulary:60,taskFulfillment:70,comment:'GROQ ONLY',coherenceComment:'Văn bản rõ ý.',strengths:[],weaknesses:[],suggestions:[],suggestedAnswer:'Hello there.'}],
}}};
test('Groq pending has its own progress status and cannot leak completed Gemini scores or feedback',()=>{
  const value=applyReferenceSummary(primary,{status:'PROCESSING',enabled:true,revision:'pending'});
  assert.equal(value.gradingStatus,'PROCESSING');assert.equal(value.result.method,'PENDING_AI');
  assert.equal(value.result.speaking,undefined);assert.equal(value.score,null);assert.equal(value.estimatedCefr,null);
  assert.equal(value.result.items[0].assessment,undefined);assert.equal(value.assessmentProvider,'groq');
  assert.equal(primary.gradingStatus,'COMPLETED');assert.equal(primary.score,45);
});
test('Groq transcript maps to the same four-criterion layout without inventing audio scores',()=>{
  const value=applyReferenceSummary(primary,reference);
  assert.deepEqual(value.result.speaking.criteria,{grammarVocabulary:60,pronunciation:null,fluency:null,taskFulfillment:70});
  assert.equal(value.result.items[0].assessment.feedback,'GROQ ONLY');
  assert.equal(value.result.items[0].selectedAnswer.mediaKey,'recording');
  assert.equal(value.estimatedCefr,null);assert.equal(value.score,null);
  assert.equal(Object.keys(value.result.items[0].assessment.details.criterionFeedback).length,4);
});
test('part reads preserve original audio and teacher answer but use only selected model feedback',()=>{
  const original={component:'SPEAKING',partNumber:1,paper:{questions:[]},items:[{key:'q',sampleAnswer:'TEACHER',selectedAnswer:{kind:'AUDIO',mediaKey:'audio'},assessment:{feedback:'GEMINI ONLY'}}]};
  const value=applyReferencePart(original,reference);
  assert.equal(value.items[0].assessment.feedback,'GROQ ONLY');assert.equal(value.items[0].sampleAnswer,'TEACHER');
  assert.equal(value.items[0].selectedAnswer.mediaKey,'audio');assert.equal(value.paper,original.paper);
  assert.equal(applyReferencePart(original,{status:'PROCESSING'}).items[0].assessment,null);
});
test('Writing part data uses Groq feedback, and missing result does not fall back to Gemini',()=>{
  const original={partNumber:2,writing:{part:{overview:'Gemini'}},items:[]};
  assert.equal(applyReferencePart(original,{status:'FAILED'}).writing,undefined);
  const value=applyReferencePart(original,{status:'COMPLETED',result:{writing:{details:{parts:[{partNumber:2,overview:'Groq'}]}}}});
  assert.equal(value.writing.part.overview,'Groq');
});
test('skipped transcript parts remain in the shared Speaking navigation and side panel',()=>{
  const value=referenceSpeakingPresentation({...reference,result:{speaking:{...reference.result.speaking,
    inputs:[...reference.result.speaking.inputs,{key:'p4:q1',partNumber:4,recorded:false,transcript:''}]}}});
  assert.equal(value.items[1].outcome,'SKIPPED');assert.equal(value.speaking.partFeedback[1].partNumber,4);
});
