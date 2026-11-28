import 'reflect-metadata';
import 'dotenv/config';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { ConfigService } from '@nestjs/config';
import configuration from '../src/config/configuration';
import db from '../src/database/data-source';
import { GeminiProvider } from '../src/common/ai/providers/gemini.provider';
import { WritingAiConfig } from '../src/features/writing-assessment/writing-ai-config.service';
import { WritingInputBuilder } from '../src/features/writing-assessment/services/writing-input-builder.service';
import { WritingAssessmentService } from '../src/features/writing-assessment/services/writing-assessment.service';
import { WritingAssessmentValidator } from '../src/features/writing-assessment/services/writing-assessment-validator.service';
import { GroqReferenceProvider } from '../src/features/reference-assessment/groq-reference.provider';
import { assessWritingByParts } from '../src/features/reference-assessment/writing-parts.policy';
import { REFERENCE_SPEAKING_PROMPT, speakingReferenceSchema, validateReferenceSpeaking } from '../src/features/reference-assessment/speaking-reference.policy';
import { SpeakingAiConfig } from '../src/features/test-attempts/services/speaking-ai-config.service';
import { SpeakingAiProvider } from '../src/features/test-attempts/services/speaking-ai-provider.service';
import { SpeakingAudioService } from '../src/features/test-attempts/services/speaking-audio.service';
import { AssessmentPaperFactory } from '../src/features/test-attempts/assessments/assessment-paper.factory';
import { SPEAKING_RUBRIC } from '../src/features/test-attempts/assessments/speaking-ai-policy';
const reportPath='benchmark-writing-2026-11-26.json';
const resume=process.argv.includes('--resume') && existsSync(reportPath);
const report:any=resume ? JSON.parse(readFileSync(reportPath,'utf8')) : {startedAt:new Date().toISOString(),cases:[],calls:[],notes:['One attempt per case; no automatic retries of HTTP/content failures. Existing production prompts and validators. Scores never persisted. Groq call quota ledger retained.']};
const file=reportPath;
const save=()=>writeFileSync(file,JSON.stringify(report,null,2));
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
let current:any, last=0;
const nativeFetch=globalThis.fetch;
globalThis.fetch=async (url:any,options:any)=>{
 const target=String(url); const generation=target.includes(':generateContent')||target.includes('/chat/completions');
 if(!generation)return nativeFetch(url,options);
 await sleep(Math.max(0,16000-(Date.now()-last))); last=Date.now();
 const call:any={model:current.model,skill:current.skill,attemptId:current.attemptId,stage:current.stage,startedAt:new Date().toISOString()};report.calls.push(call);
 const at=Date.now();try{const res=await nativeFetch(url,{...options,signal:AbortSignal.timeout(current.skill==='WRITING'?Number(process.env.WRITING_AI_REQUEST_TIMEOUT_MS||60000):90000)});call.http=res.status;const body:any=await res.clone().json().catch(()=>({}));call.status=body.error?.status||body.error?.code||'OK';call.quota=(body.error?.details??[]).flatMap((d:any)=>(d.violations??[]).map((v:any)=>({metric:v.quotaMetric,id:v.quotaId,value:v.quotaValue})));call.usage=body.usageMetadata??body.usage;call.finish=body.candidates?.[0]?.finishReason||body.choices?.[0]?.finish_reason;return res;}catch(e:any){call.status=e.name;throw e;}finally{call.elapsedMs=Date.now()-at;save();console.log(JSON.stringify({event:'request',...call}));}
};
async function main(){
 const cs=new ConfigService({...process.env,...configuration()});const wc=new WritingAiConfig(cs);const sc=new SpeakingAiConfig(cs);
 if(sc.tier!=='FREE'||process.env.GROQ_FREE_TIER_CONFIRMED!=='true')throw Error('FREE_TIER_REQUIRED');
 await db.initialize();
 try{
 let rows=await db.query(`SELECT * FROM (SELECT a.id,a.component,a.scope,a.result,s.snapshot,p.answers,a.submitted_at,md5(a.result::text) result_hash,row_number() OVER(PARTITION BY a.component ORDER BY a.submitted_at DESC) n FROM test_attempts a JOIN test_snapshots s ON s.id=a.snapshot_id JOIN attempt_progress p ON p.attempt_id=a.id WHERE a.status='SUBMITTED' AND p.sealed_at IS NOT NULL AND a.component IN ('WRITING')) x WHERE n<=5 ORDER BY n,component`);
 if(resume) {
 rows=await db.query(`SELECT a.id,a.component,a.scope,a.result,s.snapshot,p.answers,a.submitted_at,md5(a.result::text) result_hash FROM test_attempts a JOIN test_snapshots s ON s.id=a.snapshot_id JOIN attempt_progress p ON p.attempt_id=a.id WHERE a.id=ANY($1::uuid[]) ORDER BY array_position($1::uuid[],a.id)`,[report.samples.map((r:any)=>r.id)]);
 report.interruptedCases ??=[];
 report.cases=report.cases.filter((c:any)=>{if(c.status==='RUNNING'||c.code==='ECONNREFUSED'){report.interruptedCases.push(c);return false;}return true;});
 report.resumedAt=new Date().toISOString();
 }
 report.baselineHashes ??= rows.map((r:any)=>({id:r.id,hash:r.result_hash}));
 report.unavailableModels=[{model:'google/gemma-4-31b-it:free',provider:'OpenRouter',reason:'OPENROUTER_API_KEY_MISSING',requests:0}];
 report.samples=rows.map((r:any)=>({id:r.id,skill:r.component,submittedAt:r.submitted_at,scope:r.scope}));save();
 const media=new SpeakingAudioService(sc);const memo=new Map<string,Buffer>();const audio:any={normalize:async(u:string)=>{if(!memo.has(u))memo.set(u,await media.normalize(u));return memo.get(u);},download:async(u:string,i:boolean)=>{if(!memo.has(u))memo.set(u,await media.download(u,i));return memo.get(u);}};
 const groq=new GroqReferenceProvider(cs,db);
 for(const sample of rows)for(const model of ['gemini-3.1-flash-lite','gemini-3.5-flash-lite','gemini-3.6-flash','gemini-3.8-flash','openai/gpt-oss-120b','qwen/qwen3.8-27b']){
 if(report.cases.some((c:any)=>c.model===model&&c.attemptId===sample.id))continue;
 current={model,skill:sample.component,attemptId:sample.id,stage:'prepare',status:'RUNNING'};report.cases.push(current);save();const start=Date.now();
 try{
 const isGroq=model.startsWith('openai/')||model.startsWith('qwen/');
 const actual:any=isGroq?groq:new GeminiProvider(cs);
 const provider:any={generateStructured:async(req:any)=>{for(let gate=0;;gate++){const before=report.calls.length;try{return await actual.generateStructured(req);}catch(e:any){if(e.code==='GROQ_RATE_WAIT'&&report.calls.length===before&&gate<3&&(e.retryAfterMs??30000)<=65000){await sleep(e.retryAfterMs??30000);continue;}throw e;}}}};
 if(sample.component==='WRITING'){
 const input=new WritingInputBuilder().build(sample.snapshot,sample.answers,sample.scope,'vi',sample.result?.assistance?.revealedKeys,2);
 if(isGroq)await assessWritingByParts(provider,input,model,'benchmark',undefined,async()=>{},async(stage)=>{current.stage=stage;});
 else await new WritingAssessmentService(provider,new WritingAssessmentValidator()).assessByParts(input,{...wc.snapshot('vi'),model},'benchmark',undefined,async()=>{},async(stage)=>{current.stage=stage;});
 }else{
 const paper=new AssessmentPaperFactory().build('SPEAKING',sample.snapshot);const [cached]=await db.query('SELECT responses FROM speaking_grading_jobs WHERE attempt_id=$1 LIMIT 1',[sample.id]);
 const transcripts={...(cached?.responses??{})};delete transcripts.__assessment;delete transcripts.__assessmentPromptVersion;
 const recordings=Object.entries(sample.answers).flatMap(([key,v]:any)=>v?.kind==='AUDIO'&&v.mediaKey?.trim()?[{key,mediaKey:v.mediaKey}]:[]);
 if(!recordings.length)throw Error('NO_RECORDINGS');
 if(recordings.some(r=>typeof transcripts[r.key]!=='string'))throw Error('CACHED_TRANSCRIPT_MISSING');
 current.stage='full';
 if(isGroq){const inputs=paper.items.map(item=>{const part:any=paper.parts[String(item.partNumber)];return {key:item.key,partNumber:item.partNumber,transcript:transcripts[item.key]??'',recorded:recordings.some(r=>r.key===item.key),question:item.partNumber===4?{topic:part.topic,questions:part.questions}:part.questions?.find((q:any)=>q.key===item.key)?.text,referenceSample:item.sampleAnswer??null,referenceGuidance:item.explanation??null,taskImageUnavailable:!!(part.imageUrl||part.imageUrls?.length)};});const recorded=inputs.filter(i=>i.transcript.trim());const raw=await provider.generateStructured({model,systemInstruction:REFERENCE_SPEAKING_PROMPT,input:{mode:paper.mode,rubricReference:SPEAKING_RUBRIC,responses:recorded,skippedKeys:inputs.filter(i=>!i.transcript.trim()).map(i=>i.key)},outputSchema:speakingReferenceSchema(recorded.map(i=>i.key)),maxOutputTokens:4096,signal:AbortSignal.timeout(90000)});validateReferenceSpeaking(raw,inputs);
 }else{const job:any={attempt_id:sample.id,lease_token:'benchmark',failures:0,responses:transcripts};const jobs:any={renew:async()=>{},cache:async(_:any,k:string,v:string)=>{job.responses[k]=v;},reserve:async()=> 'benchmark',charge:async()=>{},budget:async()=>({used:0,reserved:0})};await new SpeakingAiProvider({...sc,model} as SpeakingAiConfig,audio,jobs).assess(job,paper,recordings);}
 }
 current.status='VALID';
 }catch(e:any){current.status='FAILED';current.code=['TimeoutError','AbortError'].includes(e.name)?'AI_TIMEOUT':(typeof e.code==='string'?e.code:(/^[A-Z][A-Z0-9_]+$/.test(e.message)?e.message:e.name));current.rule=e.validationRule??null;}
 current.elapsedMs=Date.now()-start;save();if(current.code==='ECONNREFUSED')throw Error('DATABASE_UNAVAILABLE');console.log(JSON.stringify({event:'case',...current}));
 }
 const after=await db.query('SELECT id,md5(result::text) result_hash FROM test_attempts WHERE id=ANY($1::uuid[])',[rows.map((r:any)=>r.id)]);report.resultHashesUnchanged=rows.every((r:any)=>after.find((a:any)=>a.id===r.id)?.result_hash===r.result_hash);report.finishedAt=new Date().toISOString();save();
 }finally{await db.destroy();}
}
main().catch(e=>{console.log(JSON.stringify({fatal:e.code||e.name}));process.exitCode=1;});
