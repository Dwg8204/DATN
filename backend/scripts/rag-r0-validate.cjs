const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const corpus=read('resources/chatbot-knowledge/corpus.json');
const inventory=read('test/fixtures/rag-r0-inventory.json');
const gold=read('test/fixtures/rag-gold.json');
const review=read('test/fixtures/rag-r0-review-questions.json');
const byId=new Map(review.map(q=>[q.id,q]));
const keys=new Set(corpus.map(d=>d.key));
assert.equal(keys.size,corpus.length);
for(const [usage,n] of [['LESSON',45],['PART_STRATEGY',18],['CRITERION_GUIDE',10]])assert.equal(corpus.filter(d=>d.usage===usage).length,n);
for(const t of inventory.topics)assert.equal(corpus.filter(d=>d.usage==='LESSON'&&d.topicCodes.includes(t.code)).length,1);
for(const d of corpus){
 assert.match(d.key,/^[a-z0-9-]{1,150}$/);
 assert.ok(['GENERAL','LESSON','PART_STRATEGY','CRITERION_GUIDE'].includes(d.usage));
 for(const code of d.topicCodes)assert.ok(inventory.topics.some(t=>t.code===code));
 if(d.usage==='GENERAL')continue;
 assert.ok(['DRAFT','AI_APPROVED','NEEDS_REVISION'].includes(d.reviewStatus));
 if(d.reviewStatus==='DRAFT')assert.equal(d.reviewedAt,null);
 else {assert.equal(d.review.type,'AI');assert.equal(d.review.humanReviewed,false);assert.ok(d.reviewedAt);}
 if(d.usage==='LESSON'){
  const count=d.sections.map(s=>s.text).join(' ').trim().split(/\s+/u).length;
  assert.ok(count>=300&&count<=600,`${d.key}: ${count} words`);
 }
}
assert.equal(gold.samples.length,60);
for(const component of ['GRAMMAR_VOCAB','READING','LISTENING'])assert.equal(gold.samples.filter(s=>s.component===component).length,20);
assert.equal(new Set(gold.samples.map(s=>s.questionId)).size,60);
for(const s of gold.samples){
 const q=byId.get(s.questionId);assert.ok(q);assert.equal(q.question_hash,s.questionHash);
 assert.ok(keys.has(s.documentKey));assert.notDeepEqual(s.correctAnswer,s.syntheticWrongAnswer);
 assert.ok(s.similarQuestionIds.length>=3&&s.similarQuestionIds.length<=5);
 assert.equal(new Set(s.similarQuestionIds).size,s.similarQuestionIds.length);
 for(const id of s.similarQuestionIds){const r=byId.get(id);assert.ok(r);assert.notEqual(r.test_id,q.test_id);assert.equal(r.component,q.component);}
 assert.ok(['DRAFT','NEEDS_REVISION'].includes(s.reviewStatus));
 if(s.review){
  assert.equal(s.evaluationEligible,false);
  assert.equal(s.review.pairs.length,s.similarQuestionIds.length);
  assert.deepEqual(s.review.pairs.map(p=>p.questionId),s.similarQuestionIds);
  assert.ok(s.review.pairs.every(p=>['REJECTED','NEAR_DUPLICATE','AUDIO_UNVERIFIED','STRATEGY_RELEVANT'].includes(p.status)&&p.reason));
 }
 assert.ok(!/kiểm tra luồng|chưa đối chiếu/i.test(JSON.stringify(s.explanation)));
}
console.log('PASS R0 structural checks: 45 lessons, 18 strategies, 10 criteria, 60 samples. Structural PASS does not approve content or make labels eligible for final metrics.');
