import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AiProvider, JsonSchema } from '../../common/ai/ai-provider.interface';
import { AiError } from '../../common/ai/ai-error';
import { diagnoseGroqJson, recoverMissingWritingPartSuggestions } from './groq-json-diagnostic';

export function groqSchema(schema: JsonSchema): object {
  const { nullable, properties, items, enum: values, ...rest } = schema;
  // Preserve count/text constraints so constrained decoding agrees with domain validation.
  // Nullable enums must explicitly allow null, including the PART-only CEFR enum [].
  if (nullable && values?.length === 0) return { type: 'null' };
  return { ...rest, ...(nullable ? { type: [schema.type, 'null'] } : {}),
    ...(values ? {enum:nullable ? [...values,null] : values} : {}),
    ...(properties ? { properties: Object.fromEntries(Object.entries(properties).map(([key,value]) => [key,groqSchema(value)])), additionalProperties:false } : {}),
    ...(items ? {items:groqSchema(items)} : {}) };
}

export function groundedGroqSchema(schema:JsonSchema,input:unknown):object {
  const result=groqSchema(schema) as Record<string,any>;
  const evidence=(input as {evidenceCatalog?:Array<{id?:unknown}>})?.evidenceCatalog;
  if(Array.isArray(evidence) && evidence.length) {
    const ids=[...new Set(evidence.map(entry=>entry.id).filter((id):id is string=>typeof id==='string'))];
    if(ids.length) {
      const visitIds=(node:Record<string,any>)=>{
        for(const [field,child] of Object.entries(node.properties ?? {}) as [string,any][]) {
          if(field==='evidenceId') node.properties[field]={$ref:Array.isArray(child.type) && child.type.includes('null')
            ? '#/$defs/optionalEvidenceId' : '#/$defs/evidenceId'};
          else visitIds(child);
        }
        if(node.items) visitIds(node.items);
      };
      visitIds(result);
      // Reuse the ID enum instead of repeating it for every criterion, to bound input tokens.
      return {...result,$defs:{evidenceId:{type:'string',enum:ids},optionalEvidenceId:{type:['string','null'],enum:[...ids,null]}}};
    }
  }
  const catalog=(input as {verbatimEvidence?:Array<{exactSentenceCandidates?:unknown[]}>})?.verbatimEvidence;
  if(!Array.isArray(catalog)) return result;
  const quotes=new Set<string>();
  for(const entry of catalog) for(const candidate of entry.exactSentenceCandidates ?? []) {
    if(typeof candidate!=='string') continue;
    const normalized=candidate.replace(/\s+/gu,' ').trim();
    if(normalized && normalized.length<=1500) quotes.add(normalized);
    // Single words and short spans also support corrections of short Part 1 responses.
    if(normalized.length<200) {
      const words=normalized.split(' ');
      for(let start=0;start<words.length && quotes.size<180;start++)
        for(let end=start+1;end<=Math.min(words.length,start+4) && quotes.size<180;end++) quotes.add(words.slice(start,end).join(' '));
    }
  }
  if(!quotes.size) return result;
  const visit=(node:Record<string,any>)=>{
    if(node.properties) {
      for(const [key,value] of Object.entries(node.properties)) {
        if(key==='quote' || key==='original') node.properties[key]={$ref:'#/$defs/verbatimQuote'};
        else if(key==='evidenceQuotes') node.properties[key]={...(value as object),items:{$ref:'#/$defs/verbatimQuote'}};
        else visit(value as Record<string,any>);
      }
    }
    if(node.items) visit(node.items);
  };
  visit(result);
  return {...result,$defs:{verbatimQuote:{type:'string',enum:[...quotes]}}};
}

@Injectable()
export class GroqReferenceProvider implements AiProvider {
  private readonly logger = new Logger(GroqReferenceProvider.name);
  constructor(private readonly config: ConfigService, private readonly db: DataSource) {}
  async generateStructured(request: Parameters<AiProvider['generateStructured']>[0]): Promise<unknown> {
    if (String(this.config.get('GROQ_FREE_TIER_CONFIRMED')) !== 'true') throw new AiError('GROQ_FREE_NOT_CONFIRMED');
    // Shared across instances. Upstream token limits may still require a longer wait.
    const intervalMs = 30000;
    const id = await this.db.transaction(async manager => {
      await manager.query('SELECT pg_advisory_xact_lock(1760000019)');
      const [count] = await manager.query(`SELECT count(*) FILTER(WHERE created_at>now()-interval '30 seconds') AS minute,
        count(*) AS day,
        GREATEST(0,30000-EXTRACT(EPOCH FROM (now()-max(created_at)))*1000) AS wait_ms
        FROM reference_ai_calls WHERE created_at>now()-interval '24 hours'`);
      if (Number(count.minute)) throw new AiError('GROQ_RATE_WAIT',true,Math.max(1000,Math.ceil(Number(count.wait_ms) || intervalMs)));
      // Application cap, not a billing tier or a guarantee of available provider tokens.
      const configuredCap = Number(this.config.get('GROQ_REFERENCE_DAILY_CALL_CAP', 100));
      const dailyCap = Number.isInteger(configuredCap) && configuredCap >= 1 && configuredCap <= 100 ? configuredCap : 100;
      if (Number(count.day)>=dailyCap) throw new AiError('GROQ_DAILY_WAIT',true,3600000);
      const [row] = await manager.query('INSERT INTO reference_ai_calls(model) VALUES($1) RETURNING id',[request.model]);
      return row.id;
    });
    const started=Date.now();
    let response: Response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:'POST', redirect:'error', signal:request.signal,
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${this.config.get('GROQ_API_KEY','')}`},
        body:JSON.stringify({model:request.model,temperature:0,reasoning_effort:'low',
          max_completion_tokens:request.maxOutputTokens,
          messages:[{role:'system',content:request.systemInstruction},{role:'user',content:JSON.stringify(request.input)}],
          response_format:{type:'json_schema',json_schema:{name:'assessment',strict:true,schema:groundedGroqSchema(request.outputSchema,request.input)}}}),
      });
    } catch { this.logger.warn(`Groq network failure: model=${request.model} elapsedMs=${Date.now()-started}`); throw new AiError('GROQ_NETWORK_ERROR',true); }
    if (!response.ok) {
      const body=await response.json().catch(()=>({})) as {error?:{code?:unknown;type?:unknown;message?:unknown;failed_generation?:unknown}};
      const safe=(value:unknown)=>typeof value==='string'?value.replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,100):'unknown';
      const upstreamCode=safe(body.error?.code);
      const diagnostic={httpStatus:response.status,upstreamCode,upstreamType:safe(body.error?.type),
        tokenCounts:typeof body.error?.message==='string'?body.error.message.match(/(?:limit|requested|used)\s*[:=]?\s*\d+/gi)?.join(' ') ?? null:null,
        generatedCharacters:typeof body.error?.failed_generation==='string'?body.error.failed_generation.length:0,
        maxOutputTokens: request.maxOutputTokens,
        json: diagnoseGroqJson(body.error?.failed_generation, request.outputSchema),
        elapsedMs:Date.now()-started};
      await this.db.query('UPDATE reference_ai_calls SET usage=$2::jsonb WHERE id=$1',[id,JSON.stringify({diagnostic})]);
      const invalidJson=response.status===400 && upstreamCode==='json_validate_failed';
      if (invalidJson) {
        const recovered = recoverMissingWritingPartSuggestions(body.error?.failed_generation, request.outputSchema);
        if (recovered !== undefined) {
          this.logger.warn(`Groq response normalized: model=${request.model} http=400 rule=MISSING_PART_SUGGESTIONS action=EMPTY_LIST domainValidation=pending elapsedMs=${diagnostic.elapsedMs}`);
          return recovered;
        }
      }
      this.logger.warn(`Groq request failed: model=${request.model} http=${response.status} upstream=${upstreamCode} generatedCharacters=${diagnostic.generatedCharacters} tokens=${diagnostic.tokenCounts ?? 'unknown'} json=${diagnostic.json.kind} issue=${diagnostic.json.issues[0]?.path ?? 'none'} issueRule=${diagnostic.json.issues[0]?.rule ?? 'none'} maxOutput=${request.maxOutputTokens} elapsedMs=${diagnostic.elapsedMs}`);
      const message = typeof body.error?.message === 'string' ? body.error.message : '';
      const limit = Number(message.match(/limit\s*[:=]?\s*(\d+)/i)?.[1]);
      const requested = Number(message.match(/requested\s*[:=]?\s*(\d+)/i)?.[1]);
      const tokenLimit = response.status === 413 && upstreamCode === 'rate_limit_exceeded'
        && diagnostic.upstreamType === 'tokens' && limit > 0 && requested > limit;
      throw new AiError(invalidJson?'GROQ_JSON_GENERATION_FAILED':`GROQ_HTTP_${response.status}`,
        invalidJson || response.status===429 || response.status>=500,
        Math.min(86400000, Math.max(intervalMs,(Number(response.headers.get('retry-after')) || 30)*1000)),
        tokenLimit ? 'TOKEN_LIMIT_EXCEEDED' : invalidJson ? diagnostic.json.kind : undefined);
    }
    const body = await response.json() as {choices?:Array<{finish_reason:string;message:{content:string}}>;usage?:object};
    await this.db.query('UPDATE reference_ai_calls SET usage=$2::jsonb WHERE id=$1',[id,JSON.stringify(body.usage ?? {})]);
    this.logger.log(`Groq response: model=${request.model} finish=${body.choices?.[0]?.finish_reason ?? 'none'} elapsedMs=${Date.now()-started}`);
    if (body.choices?.[0]?.finish_reason!=='stop') throw new AiError('GROQ_RESPONSE_INCOMPLETE',true);
    try { return JSON.parse(body.choices[0].message.content); } catch { throw new AiError('GROQ_INVALID_JSON'); }
  }
}
