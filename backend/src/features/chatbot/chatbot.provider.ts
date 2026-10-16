import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { createHash, randomUUID } from 'crypto';
import { chatError } from './chatbot.repository';

export type GeminiContent = { role: 'user'|'model'; parts: any[] };
export type ChatCallContext = { userId: string; messageId: string };

@Injectable()
export class ChatbotProvider {
  constructor(private readonly config: ConfigService, private readonly db: DataSource) {}
  get model() { return this.config.get<string>('CHATBOT_MODEL','gemini-3.5-flash-lite'); }
  get enabled() { return String(this.config.get('CHATBOT_ENABLED','false'))==='true'; }
  assertReady() {
    if(!this.enabled) throw chatError('CHAT_DISABLED',503);
    if(this.config.get('GEMINI_BILLING_TIER')!=='FREE' || String(this.config.get('GEMINI_FREE_PROJECT_CONFIRMED'))!=='true'
      || String(this.config.get('GEMINI_PAID_PROJECT_CONFIRMED','false'))==='true' || !this.config.get('GEMINI_API_KEY')) throw chatError('CHAT_CONFIG_INVALID',503);
    if(!/^[\w.-]+$/.test(this.model)) throw chatError('CHAT_CONFIG_INVALID',503);
  }
  async generate(system: string,contents: GeminiContent[],tools: any[],ctx: ChatCallContext,signal: AbortSignal) {
    this.assertReady();
    const id=randomUUID();
    const request={systemInstruction:{parts:[{text:system}]},contents,
      ...(tools.length ? {tools:[{functionDeclarations:tools}]} : {}),
      generationConfig:{temperature:0.2,maxOutputTokens:4096,responseMimeType:'application/json',responseSchema:{
        type:'OBJECT',properties:{text:{type:'STRING'},citationIds:{type:'ARRAY',items:{type:'STRING'},maxItems:6},
          actions:{type:'ARRAY',maxItems:3,items:{type:'OBJECT',properties:{code:{type:'STRING'},attemptId:{type:'STRING'}},required:['code']}}},
        required:['text','citationIds','actions']}}};
    await this.db.query(`INSERT INTO ai_requests(id,user_id,purpose,provider,model,chat_message_id,idempotency_key,
      request_fingerprint,config_snapshot,status,pricing_snapshot,currency,started_at)
      VALUES($1,$2,'CHAT','gemini',$3,$4,$1,$5,$6,'RUNNING','{"tier":"FREE"}','USD',now())`,
    [id,ctx.userId,this.model,ctx.messageId,createHash('sha256').update(JSON.stringify(request)).digest('hex'),JSON.stringify({promptVersion:'aptimate-chat-v1',model:this.model})]);
    try {
      const body=await this.request(this.model,'generateContent',request,signal);
      const usage=body.usageMetadata??{};
      const candidate=body.candidates?.[0];
      if(body.promptFeedback?.blockReason || candidate?.finishReason==='SAFETY') throw chatError('CHAT_SAFETY',422);
      if(!candidate?.content?.parts?.length || candidate.finishReason!=='STOP') throw chatError('CHAT_INCOMPLETE',502);
      await this.db.query(`UPDATE ai_requests SET status='COMPLETED',completed_at=now(),input_tokens=$2,output_tokens=$3,
        cached_input_tokens=$4,reasoning_tokens=$5,actual_cost=0 WHERE id=$1`,
      [id,usage.promptTokenCount??null,usage.candidatesTokenCount??null,usage.cachedContentTokenCount??null,usage.thoughtsTokenCount??null]);
      // Preserve the entire provider content, including thoughtSignature and function-call IDs.
      return candidate.content as GeminiContent;
    } catch(e:any) {
      const code=signal.aborted?'CHAT_TIMEOUT':e.code??'CHAT_UNAVAILABLE';
      await this.db.query(`UPDATE ai_requests SET status='FAILED',error_code=$2,completed_at=now() WHERE id=$1`,[id,code]);
      throw chatError(code,503);
    }
  }
  async request(model: string,method: string,body: unknown,signal: AbortSignal): Promise<any> {
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}`,{
      method:'POST',redirect:'error',signal,headers:{'Content-Type':'application/json','x-goog-api-key':this.config.get<string>('GEMINI_API_KEY','')},body:JSON.stringify(body)});
    if(!response.ok) throw chatError(response.status===429?'CHAT_QUOTA':`CHAT_PROVIDER_${response.status}`,503);
    return response.json();
  }
  async embed(text: string,query: boolean,signal: AbortSignal) {
    this.assertReady();
    const result=await this.request('gemini-embedding-001','embedContent',{
      model:'models/gemini-embedding-001',content:{parts:[{text}]},taskType:query?'RETRIEVAL_QUERY':'RETRIEVAL_DOCUMENT',outputDimensionality:768},signal);
    return normalizeVector(result.embedding?.values);
  }
}

export function normalizeVector(values: unknown): number[] {
  if(!Array.isArray(values)||values.length!==768||values.some(v=>typeof v!=='number'||!Number.isFinite(v))) throw chatError('CHAT_EMBEDDING_INVALID',502);
  const norm=Math.sqrt(values.reduce((s,v)=>s+v*v,0));
  if(!norm) throw chatError('CHAT_EMBEDDING_INVALID',502);
  return values.map(v=>v/norm);
}
