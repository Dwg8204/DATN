import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { AiError } from '../../common/ai/ai-error';
import { ApplicationError } from '../../common/errors/application.error';
import { WritingInputBuilder } from '../writing-assessment/services/writing-input-builder.service';
import { WritingJobConfig } from '../writing-assessment/writing-ai-config.service';
import { AssessmentPaperFactory } from '../test-attempts/assessments/assessment-paper.factory';
import { SPEAKING_PROMPT_VERSION, SPEAKING_RUBRIC } from '../test-attempts/assessments/speaking-ai-policy';
import { SpeakingAudioService } from '../test-attempts/services/speaking-audio.service';
import { SpeakingAiConfig } from '../test-attempts/services/speaking-ai-config.service';
import { SharedSpeakingTranscript } from '../test-attempts/services/shared-speaking-transcript.service';
import { GroqReferenceProvider } from './groq-reference.provider';
import { REFERENCE_SPEAKING_PROMPT, speakingReferenceSchema, validateReferenceSpeaking } from './speaking-reference.policy';
import { assessWritingByParts, GROQ_PARTS_WRITING_VERSION, WritingPartsCache } from './writing-parts.policy';
import { firstMutationRow } from '../../common/database/mutation-result';
import { WritingEvidenceError } from '../writing-assessment/services/writing-evidence.error';

export function referenceInputHash(snapshot:unknown,answers:unknown,config:WritingJobConfig):string {
  // Retry counters and lastFailure are mutable job metadata, not assessment input.
  const {provider,model,promptVersion,rubricVersion,inputVersion,schemaVersion,feedbackLocale,maxOutputTokens}=config;
  return createHash('sha256').update(JSON.stringify({snapshot,answers,config:{provider,model,promptVersion,rubricVersion,inputVersion,schemaVersion,feedbackLocale,maxOutputTokens}})).digest('hex');
}

@Injectable()
export class ReferenceAssessmentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReferenceAssessmentService.name);
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;
  private active = false;
  constructor(private readonly db:DataSource,private readonly config:ConfigService,
    private readonly provider:GroqReferenceProvider,private readonly audio:SpeakingAudioService,
    private readonly speaking:SpeakingAiConfig,private readonly transcripts:SharedSpeakingTranscript) {}
  get enabled() { return String(this.config.get('GROQ_REFERENCE_ENABLED','false'))==='true'; }
  async onModuleInit() {
    if (!this.enabled) return;
    // A broken optional configuration must not stop the primary Gemini application.
    if (String(this.config.get('GROQ_FREE_TIER_CONFIRMED'))!=='true' || this.config.get<string>('GROQ_API_KEY','').length<20) {
      this.logger.warn('Groq reference disabled: confirm FREE tier and configure key.'); return;
    }
    try { await this.db.query('INSERT INTO reference_ai_activation(id) VALUES(true) ON CONFLICT DO NOTHING'); }
    catch { this.logger.warn('Groq reference disabled: run the new migration first.'); return; }
    this.active=true;
    this.transcripts.active=true;
    this.timer=setInterval(()=>{ if (!this.running) this.running=this.runOnce().finally(()=>{this.running=undefined;}); },5000);
    this.timer.unref();
  }
  async onModuleDestroy() { if(this.timer) clearInterval(this.timer); await this.running; }
  async result(attemptId:string,userId:string) {
    const [attempt]=await this.db.query(`SELECT component,scope,purpose,submitted_at FROM test_attempts WHERE id=$1 AND student_id=$2 AND status='SUBMITTED' AND component IN ('WRITING','SPEAKING')`,[attemptId,userId]);
    if (!attempt) throw new ApplicationError('ATTEMPT_NOT_FOUND','Attempt not found.',404);
    const [exists]=await this.db.query("SELECT to_regclass('reference_ai_jobs') AS name");
    const [job]=exists.name ? await this.db.query(`SELECT status,model,result,error_code,updated_at,available_at,runs,config FROM reference_ai_jobs WHERE attempt_id=$1`,[attemptId]) : [];
    const [activation]=exists.name ? await this.db.query('SELECT enabled_since FROM reference_ai_activation WHERE id=true') : [];
    const eligible=this.active && !!activation && new Date(attempt.submitted_at)>=new Date(activation.enabled_since);
    return {provider:'groq',primary:false,component:attempt.component,scope:attempt.scope,purpose:attempt.purpose,
      enabled:this.active,eligible,status:job?.status ?? 'NOT_REQUESTED',model:job?.model ?? 'openai/gpt-oss-120b',
      result:job?.result ?? null,errorCode:job?.error_code ?? null,revision:job?.updated_at ?? null,
      nextRetryAt:job?.status==='QUEUED'?job.available_at:null,validationRule:job?.config?.lastFailure?.rule ?? null,
      stage:job?.config?.writingStage ?? null,
      completedParts:Object.keys(job?.config?.writingParts?.parts ?? {}).map(Number).filter(Number.isInteger).sort((a,b)=>a-b),
      retryable:this.active && job?.status==='FAILED' && Number(job?.config?.manualRetries ?? 0)<3};
  }
  async retry(attemptId:string,userId:string) {
    await this.result(attemptId,userId);
    if(!this.active) throw new ApplicationError('GROQ_REFERENCE_DISABLED','Groq reference assessment is disabled.',503);
    const rows=await this.db.query(`UPDATE reference_ai_jobs SET status='QUEUED',runs=0,error_code=NULL,lease=NULL,lease_until=NULL,input_hash=NULL,
      available_at=now(),updated_at=now(),config=config || jsonb_build_object('manualRetries',COALESCE((config->>'manualRetries')::integer,0)+1,'referenceVersion',2,'maxOutputTokens',6000)
      WHERE attempt_id=$1 AND status='FAILED' AND updated_at<now()-interval '60 seconds'
      AND COALESCE((config->>'manualRetries')::integer,0)<3 RETURNING id`,[attemptId]);
    if(!rows.length) throw new ApplicationError('GROQ_RETRY_NOT_ALLOWED','Wait a minute before retrying a failed Groq assessment (maximum three retries).',409);
    return {status:'QUEUED'};
  }
  async runOnce() {
    let job:any;
    let stage='enqueue';
    const started=Date.now();
    try {
      const config:WritingJobConfig & {referenceVersion:number}={provider:'groq',model:'openai/gpt-oss-120b',timeoutMs:90000,maxOutputTokens:6000,maxAttempts:3,referenceVersion:2,
        feedbackLocale:'vi',rubricVersion:'writing-rubric-v2',promptVersion:'writing-prompt-v3',inputVersion:2,schemaVersion:1};
      await this.db.query(`INSERT INTO reference_ai_jobs(attempt_id,model,config)
        SELECT a.id,$1,$2::jsonb FROM test_attempts a JOIN attempt_progress p ON p.attempt_id=a.id
        CROSS JOIN reference_ai_activation activation WHERE a.status='SUBMITTED' AND p.sealed_at IS NOT NULL
        AND a.submitted_at>=activation.enabled_since AND a.component IN ('WRITING','SPEAKING')
        AND ((a.component='WRITING' AND $5::boolean) OR (a.component='SPEAKING' AND $3::boolean AND EXISTS(SELECT 1 FROM speaking_ai_consents c WHERE c.attempt_id=a.id AND c.policy_version=$4)))
        ON CONFLICT(attempt_id) DO NOTHING`,[config.model,JSON.stringify(config),this.speaking.enabled,this.speaking.policyVersion,String(this.config.get('WRITING_AI_ENABLED','false'))==='true']);
      stage='claim';
      job=await this.db.transaction(async manager=>{
        const [row]=await manager.query(`SELECT * FROM reference_ai_jobs WHERE
          (status='QUEUED' AND available_at<=now()) OR (status='PROCESSING' AND lease_until<now())
          ORDER BY available_at LIMIT 1 FOR UPDATE SKIP LOCKED`);
        if(!row) return null;
        if(row.runs>=3) { await manager.query("UPDATE reference_ai_jobs SET status='FAILED',error_code='ATTEMPTS_EXHAUSTED',updated_at=now() WHERE id=$1",[row.id]); return null; }
        const lease=randomUUID();
        await manager.query("UPDATE reference_ai_jobs SET status='PROCESSING',lease=$2,lease_until=now()+interval '15 minutes',runs=runs+1,updated_at=now() WHERE id=$1",[row.id,lease]);
        return {...row,lease,runs:row.runs+1};
      });
      if(!job) return;
      stage='build_input';
      this.logger.log(`Groq reference started: job=${job.id} model=${job.model} run=${job.runs}`);
      const [data]=await this.db.query(`SELECT a.component,a.scope,a.result,s.snapshot,p.answers FROM test_attempts a
        JOIN test_snapshots s ON s.id=a.snapshot_id JOIN attempt_progress p ON p.attempt_id=a.id
        WHERE a.id=$1 AND a.status='SUBMITTED' AND p.sealed_at IS NOT NULL`,[job.attempt_id]);
      if(!data) throw new AiError('REFERENCE_INPUT_MISSING');
      const inputHash=referenceInputHash(data.snapshot,data.answers,job.config);
      if(job.input_hash && job.config.inputHashVersion===2 && job.input_hash!==inputHash) throw new AiError('REFERENCE_INPUT_CHANGED');
      await this.db.query(`UPDATE reference_ai_jobs SET input_hash=$3,config=config || '{"inputHashVersion":2}'::jsonb WHERE id=$1 AND lease=$2`,[job.id,job.lease,inputHash]);
      let result:unknown;
      if(data.component==='WRITING') {
        const input=new WritingInputBuilder().build(data.snapshot,data.answers,data.scope,'vi',data.result?.assistance?.revealedKeys,job.config.inputVersion);
        stage='writing_assess';
        const writing = await assessWritingByParts(this.provider, input, job.model, inputHash,
          job.config.writingParts as WritingPartsCache | undefined, async cache => {
            const saved = await this.db.query(`UPDATE reference_ai_jobs SET config=jsonb_set(config,'{writingParts}',$3::jsonb),updated_at=now()
              WHERE id=$1 AND lease=$2 AND status='PROCESSING' AND lease_until>now() RETURNING id`, [job.id, job.lease, JSON.stringify(cache)]);
            firstMutationRow(saved);
            this.logger.log(`Groq Writing checkpoint: job=${job.id} parts=${Object.keys(cache.parts).length} final=${!!cache.final}`);
          }, async (nextStage, event) => {
            stage=nextStage;
            if(event==='started') await this.db.query(`UPDATE reference_ai_jobs SET config=jsonb_set(config,'{writingStage}',$3::jsonb),updated_at=now()
              WHERE id=$1 AND lease=$2 AND status='PROCESSING' AND lease_until>now()`,[job.id,job.lease,JSON.stringify(nextStage)]);
            this.logger.log(`Groq Writing stage: job=${job.id} stage=${nextStage} event=${event}`);
          });
        writing.metadata={provider:'groq',model:job.model,rubricVersion:job.config.rubricVersion,promptVersion:GROQ_PARTS_WRITING_VERSION,assessedAt:new Date().toISOString(),assessmentRevision:1};
        result={writing};
      } else {
        const paper=new AssessmentPaperFactory().build('SPEAKING',data.snapshot);
        const inputs=[];
        for(const item of paper.items) {
          const answer=data.answers[item.key];
          const part=paper.parts[String(item.partNumber)] as any;
          const transcript=answer?.kind==='AUDIO' && answer.mediaKey?.trim()
            ? await this.transcripts.get(job.attempt_id,item.key,()=>this.audio.normalize(answer.mediaKey)) : '';
          inputs.push({key:item.key,partNumber:item.partNumber,transcript,recorded:!!answer?.mediaKey,
            question:item.partNumber===4 ? {topic:part.topic,questions:part.questions} : part.questions?.find((q:any)=>q.key===item.key)?.text,
            referenceSample:item.sampleAnswer ?? null,referenceGuidance:item.explanation ?? null,
            taskImageUnavailable:!!(part.imageUrl || part.imageUrls?.length)});
        }
        const recorded=inputs.filter(input=>input.transcript.trim());
        stage='speaking_generate';
        const raw=recorded.length ? await this.provider.generateStructured({model:job.model,
          systemInstruction:REFERENCE_SPEAKING_PROMPT,input:{mode:paper.mode,rubricReference:SPEAKING_RUBRIC,responses:recorded,
            skippedKeys:inputs.filter(input=>!input.transcript.trim()).map(input=>input.key)},
          outputSchema:speakingReferenceSchema(recorded.map(input=>input.key)),maxOutputTokens:4096,signal:AbortSignal.timeout(90000)})
          : {summary:'Không có transcript đủ dữ liệu để đánh giá.',responses:[]};
        stage='speaking_validate';
        result={speaking:{...validateReferenceSpeaking(raw,inputs),inputs,promptVersion:`${SPEAKING_PROMPT_VERSION}-transcript-v1`}};
      }
      stage='persist';
      await this.db.query(`UPDATE reference_ai_jobs SET result=$3::jsonb,status='COMPLETED',error_code=NULL,lease=NULL,lease_until=NULL,updated_at=now(),config=config-'lastFailure'
        WHERE id=$1 AND lease=$2 AND status='PROCESSING' AND lease_until>now()`,[job.id,job.lease,JSON.stringify(result)]);
      this.logger.log(`Groq reference completed: job=${job.id} component=${data.component} elapsedMs=${Date.now()-started}`);
    } catch(error) {
      const code=error instanceof AiError ? error.code : error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'REFERENCE_UNAVAILABLE';
      const rule=error instanceof AiError?error.validationRule?.replace(/[^a-zA-Z0-9_.:[\]-]/g,'').slice(0,180):undefined;
      const location=error instanceof WritingEvidenceError?error.location:undefined;
      const diagnostic = `job=${job?.id ?? 'none'} stage=${stage} code=${code} rule=${rule ?? 'none'} path=${location?.path ?? 'none'} questionKey=${location?.questionKey ?? 'none'} criterion=${location?.criterion ?? 'none'} run=${job?.runs ?? 0} elapsedMs=${Date.now()-started}`;
      if (['GROQ_RATE_WAIT','GROQ_DAILY_WAIT'].includes(code)) this.logger.log(`Groq reference waiting: ${diagnostic}`);
      else this.logger.warn(`Groq reference failed: ${diagnostic}`);
      if(!job) return;
      const waiting=['GROQ_RATE_WAIT','GROQ_DAILY_WAIT'].includes(code);
      const retry=waiting || (job.runs<3 && (error instanceof AiError && error.retryable || /HTTP_(429|5\d\d)$/.test(code)));
      const delay=error instanceof AiError ? error.retryAfterMs ?? 30000 : 30000;
      await this.db.query(`UPDATE reference_ai_jobs SET status=$3,error_code=$4,lease=NULL,lease_until=NULL,
        runs=runs-$6,available_at=now()+($5::integer*interval '1 millisecond'),updated_at=now(),
        config=config || jsonb_build_object('lastFailure',$7::jsonb) || $8::jsonb WHERE id=$1 AND lease=$2`,
        [job.id,job.lease,retry?'QUEUED':'FAILED',code,delay,waiting?1:0,JSON.stringify({stage,rule:rule ?? null,code,...location}),
          JSON.stringify(stage === 'writing_assess' || stage.startsWith('part_') || stage==='synthesis' ? { groqWritingPrompt: GROQ_PARTS_WRITING_VERSION } : {})]).catch(()=>this.logger.warn('Could not persist Groq reference error.'));
    }
  }
}
