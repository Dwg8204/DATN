import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { GroqReferenceProvider, groqSchema, groundedGroqSchema } from './groq-reference.provider';
import { validateReferenceSpeaking } from './speaking-reference.policy';
import { ReferenceAssessmentService, referenceInputHash } from './reference-assessment.service';
import { SharedSpeakingTranscript } from '../test-attempts/services/shared-speaking-transcript.service';
import { groqWritingInput, restoreBlankWriting } from './writing-reference.policy';
import { writingFixture } from '../writing-assessment/testing/writing.fixture';
import { WritingAssessmentService } from '../writing-assessment/services/writing-assessment.service';
import { WritingAssessmentValidator } from '../writing-assessment/services/writing-assessment-validator.service';

const input={key:'p1:q1',transcript:'I like reading.',taskImageUnavailable:false,referenceSample:null};
const response=()=>({summary:'Nhận xét văn bản.',responses:[{key:input.key,grammarVocabulary:60,taskFulfillment:70,
  comment:'Bạn diễn đạt rõ ý.',coherenceComment:'Câu có ý rõ ràng; không đánh giá tốc độ nói.',strengths:['Rõ ý'],weaknesses:[],suggestions:[],suggestedAnswer:'I like books.'}]});
describe('Groq reference isolation and evidence boundaries',()=>{
  it('never creates audio scores or CEFR from transcript',()=>{
    const result=validateReferenceSpeaking(response(),[input]);
    expect(result.estimatedCefr).toBeNull(); expect(result.score).toBeNull();
    expect(result.responses[0]).toMatchObject({pronunciation:null,fluency:null,grammarVocabulary:60});
  });
  it('does not score missing image evidence or invent strengths for skipped recordings',()=>{
    expect(validateReferenceSpeaking(response(),[{...input,taskImageUnavailable:true}]).responses[0].taskFulfillment).toBeNull();
    expect(validateReferenceSpeaking(response(),[{...input,transcript:''}]).responses[0]).toMatchObject({grammarVocabulary:null,taskFulfillment:null,strengths:[],suggestedAnswer:null});
  });
  it('rejects duplicates, unknown keys and invalid scores',()=>{
    const value=response(); value.responses[0].grammarVocabulary=101;
    expect(()=>validateReferenceSpeaking(value,[input])).toThrow();
    expect(()=>validateReferenceSpeaking(response(),[{...input,key:'p2:q1'}])).toThrow();
    const duplicated=response(); duplicated.responses.push(duplicated.responses[0]);
    expect(()=>validateReferenceSpeaking(duplicated,[input,{...input,key:'p1:q2'}])).toThrow();
  });
  it('uses strict object schemas and nullable types',()=>{
    expect(groqSchema({type:'object',properties:{value:{type:'number',nullable:true}},required:['value']})).toEqual({
      type:'object',properties:{value:{type:['number','null']}},required:['value'],additionalProperties:false});
  });
  it('allows null in CEFR enums, including PART with no numeric band',()=>{
    expect(groqSchema({type:'string',nullable:true,enum:['A1','B1']})).toEqual({type:['string','null'],enum:['A1','B1',null]});
    expect(groqSchema({type:'string',nullable:true,enum:[]})).toEqual({type:'null'});
  });
  it('hash ignores retry diagnostics while still detecting changed responses',()=>{
    const config:any={provider:'groq',model:'model',promptVersion:'v3',maxOutputTokens:8192};
    const original=referenceInputHash({}, {key:'original'},config);
    expect(referenceInputHash({}, {key:'original'},{...config,lastFailure:{rule:'QUOTE_NOT_IN_RESPONSE'},manualRetries:1,inputHashVersion:2} as any)).toBe(original);
    expect(referenceInputHash({}, {key:'changed'},config)).not.toBe(original);
  });
  it('constrains Writing quotations and correction originals to verbatim source spans',()=>{
    const schema:any=groundedGroqSchema({type:'object',properties:{quote:{type:'string'},original:{type:'string'},evidenceQuotes:{type:'array',items:{type:'string'}}},required:['quote','original','evidenceQuotes']},
      {verbatimEvidence:[{exactSentenceCandidates:['Yesterday I go to the club.']}]});
    expect(schema.$defs.verbatimQuote.enum).toContain('Yesterday I go to the club.');
    expect(schema.$defs.verbatimQuote.enum).not.toContain('Yesterday I went to the club.');
    expect(schema.properties.quote.$ref).toBe('#/$defs/verbatimQuote');
    expect(schema.properties.original.$ref).toBe('#/$defs/verbatimQuote');
    expect(schema.properties.evidenceQuotes.items.$ref).toBe('#/$defs/verbatimQuote');
  });
  it('fills skipped rows deterministically when the model only assesses recorded transcripts',()=>{
    const result=validateReferenceSpeaking(response(),[input,{...input,key:'p4:q1',transcript:''}]);
    expect(result.responses).toHaveLength(2);
    expect(result.responses[1]).toMatchObject({key:'p4:q1',grammarVocabulary:null,taskFulfillment:null,suggestedAnswer:null});
  });
  it('reports the exact invalid field without including the learner response',()=>{
    const invalid=response();invalid.responses[0].comment='';
    try {validateReferenceSpeaking(invalid,[input]);throw new Error('expected failure');}
    catch(error) {expect((error as any).validationRule).toBe('responses[0].comment.TEXT');}
  });
  it('restores blank Writing parts before validation without changing CEFR rules',()=>{
    const fixture=writingFixture();
    const input={...fixture.input,parts:fixture.input.parts.map(part=>({...part,questions:part.questions.map(question=>({...question,response:part.partNumber===2?question.response:'',wordCount:part.partNumber===2?question.wordCount:0}))}))};
    const assessor=new WritingAssessmentService({} as any,new WritingAssessmentValidator());
    const blank=assessor.blank(input);
    const part=fixture.result.details.parts.find(part=>part.partNumber===2)!;
    const generated={...fixture.result,cefr:{...blank.cefr,reason:'MISSING_PARTS'},summary:{...fixture.result.summary,partSummaries:fixture.result.summary.partSummaries.filter(part=>part.partNumber===2)},
      details:{parts:[{...part,questions:part.questions.map(question=>({...question,criteria:Object.fromEntries(question.criteria.map(({criterion,...entry})=>[criterion,entry]))}))}]}};
    const modelInput=groqWritingInput(input);
    expect(modelInput.skippedKeys).toHaveLength(10);
    expect(modelInput.parts[0].questions).toHaveLength(0);
    const result=new WritingAssessmentValidator().validate(restoreBlankWriting(generated,input,blank),input);
    expect(result.details.parts).toHaveLength(4);
    expect(result.details.parts.find(part=>part.partNumber===1)?.questions[0].responseStatus).toBe('BLANK');
    expect(result.cefr.level).toBeNull();
    const missing={...generated,details:{parts:[{...generated.details.parts[0],questions:[]}]}};
    expect(()=>new WritingAssessmentValidator().validate(restoreBlankWriting(missing,input,blank),input)).toThrow();
  });
  it('does not initialize tables or workers when disabled',async()=>{
    const db={query:jest.fn()};
    const service=new ReferenceAssessmentService(db as unknown as DataSource,new ConfigService(),null as any,null as any,null as any,null as any);
    await service.onModuleInit(); expect(db.query).not.toHaveBeenCalled();
  });
  it('checks ownership before reading supplementary results',async()=>{
    const db={query:jest.fn().mockResolvedValue([])};
    const service=new ReferenceAssessmentService(db as unknown as DataSource,new ConfigService(),null as any,null as any,null as any,null as any);
    await expect(service.result('attempt','another-user')).rejects.toThrow();
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][1]).toEqual(['attempt','another-user']);
  });
  it('reuses a shared transcript without downloading or calling ASR',async()=>{
    const runner={connect:jest.fn(),release:jest.fn(),query:jest.fn(async(sql:string)=>
      sql.includes('try_advisory')?[{acquired:true}]:sql.startsWith('SELECT transcript')?[{transcript:'I like books.'}]:[])};
    const service=new SharedSpeakingTranscript({createQueryRunner:()=>runner} as any,{} as any,new ConfigService());
    const load=jest.fn();
    await expect(service.get('attempt','p1:q1',load)).resolves.toBe('I like books.');
    expect(load).not.toHaveBeenCalled(); expect(runner.release).toHaveBeenCalled();
    expect(runner.query.mock.calls.some(([sql])=>sql.includes('advisory_unlock'))).toBe(true);
  });
  it('preserves the primary attempt when reference generation fails',async()=>{
    const statements:string[]=[];
    const db:any={query:jest.fn(async(sql:string)=>{statements.push(sql);
      if(sql.startsWith('SELECT a.component')) return []; return [];
    }),transaction:jest.fn(async(fn:any)=>fn({query:async(sql:string)=>{
      statements.push(sql);return sql.startsWith('SELECT *')?[{id:'job',attempt_id:'attempt',runs:0,config:{}}]:[];
    }}))};
    const service=new ReferenceAssessmentService(db,new ConfigService(),null as any,null as any,{enabled:true,policyVersion:'v2'} as any,null as any);
    await service.runOnce();
    expect(statements.some(sql=>/UPDATE\s+test_attempts/i.test(sql))).toBe(false);
    expect(statements.some(sql=>sql.includes('status=$3,error_code'))).toBe(true);
  });
});

describe('Groq HTTP contract (mock only)',()=>{
  const original=global.fetch;
  afterEach(()=>{global.fetch=original;});
  it('waits only for the remaining shared 30-second slot without calling Groq',async()=>{
    const manager={query:jest.fn(async(sql:string)=>sql.startsWith('SELECT count')?[{minute:1,day:2,wait_ms:22000}]:[])};
    const db={transaction:async(fn:any)=>fn(manager)};
    global.fetch=jest.fn() as any;
    const provider=new GroqReferenceProvider(new ConfigService({GROQ_FREE_TIER_CONFIRMED:'true'}),db as any);
    await expect(provider.generateStructured({model:'model',systemInstruction:'test',input:{},outputSchema:{type:'object',properties:{},required:[]},maxOutputTokens:100,signal:AbortSignal.timeout(1000)}))
      .rejects.toMatchObject({code:'GROQ_RATE_WAIT',retryAfterMs:22000});
    expect(global.fetch).not.toHaveBeenCalled();
    expect(manager.query.mock.calls.some(([sql])=>sql.includes("interval '30 seconds'"))).toBe(true);
  });
  it('defaults to 100 daily calls, honors lower caps and blocks invalid overrides at the default cap',async()=>{
    let day=99;
    const manager={query:jest.fn(async(sql:string)=>sql.startsWith('SELECT count')?[{minute:0,day}]:sql.startsWith('INSERT')?[{id:'call'}]:[])};
    const db={transaction:async(fn:any)=>fn(manager),query:jest.fn()};
    const request={model:'openai/gpt-oss-120b',systemInstruction:'test',input:{},outputSchema:{type:'object' as const,properties:{},required:[]},maxOutputTokens:100,signal:AbortSignal.timeout(1000)};
    global.fetch=jest.fn(async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'{}'}}]}))) as any;
    const normal=new GroqReferenceProvider(new ConfigService({GROQ_FREE_TIER_CONFIRMED:'true'}),db as any);
    await expect(normal.generateStructured(request)).resolves.toEqual({});
    day=100;
    await expect(normal.generateStructured(request)).rejects.toThrow('GROQ_DAILY_WAIT');
    const invalid=new GroqReferenceProvider(new ConfigService({GROQ_FREE_TIER_CONFIRMED:'true',GROQ_REFERENCE_DAILY_CALL_CAP:'9999'}),db as any);
    await expect(invalid.generateStructured(request)).rejects.toThrow('GROQ_DAILY_WAIT');
    day=20;
    const lower=new GroqReferenceProvider(new ConfigService({GROQ_FREE_TIER_CONFIRMED:'true',GROQ_REFERENCE_DAILY_CALL_CAP:'20'}),db as any);
    await expect(lower.generateStructured(request)).rejects.toThrow('GROQ_DAILY_WAIT');
    await expect(normal.generateStructured(request)).resolves.toEqual({});
  });
  it('marks only confirmed oversized token requests as eligible for compact fallback',async()=>{
    for (const [status,code,type,message,expected] of [
      [413,'rate_limit_exceeded','tokens','Limit 8000 Requested 11741','TOKEN_LIMIT_EXCEEDED'],
      [413,'payload_too_large','request','Too large',undefined],
      [429,'rate_limit_exceeded','tokens','Limit 8000 Requested 1000',undefined],
    ]) {
      const manager={query:jest.fn(async(sql:string)=>sql.startsWith('SELECT count')?[{minute:0,day:0}]:sql.startsWith('INSERT')?[{id:'call'}]:[])};
      const db={transaction:async(fn:any)=>fn(manager),query:jest.fn()};
      const provider=new GroqReferenceProvider(new ConfigService({GROQ_FREE_TIER_CONFIRMED:'true'}),db as any);
      global.fetch=jest.fn(async()=>new Response(JSON.stringify({error:{code,type,message}}),{status:status as number})) as any;
      try {
        await provider.generateStructured({model:'model',systemInstruction:'test',input:{},outputSchema:{type:'object',properties:{},required:[]},maxOutputTokens:100,signal:AbortSignal.timeout(1000)});
        throw new Error('expected HTTP failure');
      } catch(error) { expect((error as any).validationRule).toBe(expected); }
    }
  });
  it('uses Groq strict schema and never Gemini endpoints',async()=>{
    const manager={query:jest.fn(async(sql:string)=>sql.startsWith('SELECT count')?[{minute:0,day:0}]:sql.startsWith('INSERT')?[{id:'call'}]:[])};
    const db={transaction:async(fn:any)=>fn(manager),query:jest.fn()};
    const provider=new GroqReferenceProvider(new ConfigService({GROQ_FREE_TIER_CONFIRMED:'true',GROQ_API_KEY:'fake'}),db as any);
    const request=jest.fn(async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'{"ok":"yes"}'}}],usage:{total_tokens:25}})));
    global.fetch=request as any;
    await expect(provider.generateStructured({model:'openai/gpt-oss-120b',systemInstruction:'rubric',input:{response:'test'},
      outputSchema:{type:'object',properties:{ok:{type:'string'}},required:['ok']},maxOutputTokens:100,signal:AbortSignal.timeout(1000)})).resolves.toEqual({ok:'yes'});
    expect((request.mock.calls as any)[0][0]).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(JSON.parse((request.mock.calls as any)[0][1].body).response_format.json_schema.strict).toBe(true);
  });
});
