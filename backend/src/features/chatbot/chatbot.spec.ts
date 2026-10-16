import { normalizeVector } from './chatbot.provider';
import { reciprocalRankFusion } from './chatbot.knowledge';
import { parseChatReply } from './chatbot.service';
import { learningStats } from './chatbot.context';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SendChatDto } from './chatbot.dto';
import { chunkSections } from './knowledge-chunker';
import { ChatbotContext } from './chatbot.context';
import { ChatbotService } from './chatbot.service';

describe('Chatbot boundaries',()=>{
  test('normalizes embedding and rejects zero/invalid dimensions',()=>{
    const v=normalizeVector(Array(768).fill(2));expect(Math.sqrt(v.reduce((n,x)=>n+x*x,0))).toBeCloseTo(1,8);
    expect(()=>normalizeVector([1,2])).toThrow();expect(()=>normalizeVector(Array(768).fill(0))).toThrow();expect(()=>normalizeVector(Array(768).fill(NaN))).toThrow();
  });
  test('RRF merges duplicate candidates and rewards both retrieval paths',()=>{
    expect(reciprocalRankFusion([[{id:'a'},{id:'b'}],[{id:'b'},{id:'c'}]]) .map(r=>r.id)).toEqual(['b','a','c']);
  });
  test.each(['missing','javascript:alert(1)'])('rejects invented citation %s',id=>{
    expect(()=>parseChatReply(JSON.stringify({text:'Answer',citationIds:[id],actions:[]}),[],new Map())).toThrow();
  });
  test('valid citations carry source metadata from server, not model',()=>{
    const r=parseChatReply(JSON.stringify({text:'Answer',citationIds:['a'],actions:[]}),[{id:'a',title:'Source',url:'https://example.org'}],new Map());expect(r.citations[0].title).toBe('Source');
  });
  test('rejects invented routes and inaccessible attempt actions',()=>{
    for(const action of [{code:'DELETE_USER'},{code:'REVIEW_ATTEMPT',attemptId:'other'}])expect(()=>parseChatReply(JSON.stringify({text:'Answer',citationIds:[],actions:[action]}),[],new Map())).toThrow();
  });
  test('empty, truncated and oversized responses cannot complete',()=>{
    for(const raw of ['{',JSON.stringify({text:' ',citationIds:[],actions:[]}),JSON.stringify({text:'a'.repeat(12001),citationIds:[],actions:[]})])expect(()=>parseChatReply(raw,[],new Map())).toThrow();
  });
  test('blank prompts and spoofed fields fail DTO validation',()=>{
    const dto=plainToInstance(SendChatDto,{clientMessageId:'00000000-0000-4000-8000-000000000001',content:'   ',userId:'other'});
    expect(validateSync(dto,{whitelist:true,forbidNonWhitelisted:true}).length).toBeGreaterThan(0);
  });
  test('statistics do not merge skills, purpose or scopes or invent null scores',()=>{
    const base={component:'WRITING',purpose:'PRACTICE',scope:'PART',part_number:1,score:null,max_score:null,result:{parts:[]}};
    const s=learningStats([base,{...base,scope:'FULL_SKILL',part_number:null},{...base,purpose:'EXAM'}]);expect(s.groups).toHaveLength(3);expect(s.groups.every(g=>g.recentScores.length===0)).toBe(true);
  });
  test('writing weaknesses count assessed criteria only',()=>{
    const s=learningStats([{component:'WRITING',purpose:'PRACTICE',scope:'PART',part_number:2,result:{writing:{details:{parts:[{questions:[{criteria:[{criterion:'TASK',judgment:'NEEDS_IMPROVEMENT'},{criterion:'GRAMMAR',judgment:'NOT_ASSESSABLE'}]}]}]}}}}]);
    expect(s.groups[0].writingCriteria).toEqual([{criterion:'TASK',observations:1,needsImprovement:1}]);
  });
  test('simulated scores never become learning evidence',()=>{
    const s=learningStats([{id:'fake',component:'SPEAKING',result:{method:'SIMULATED',parts:[{partNumber:1,score:9,maxScore:10}]},score:90,max_score:100}]);
    expect(s.groups[0].recentScores).toEqual([]);expect(s.groups[0].parts).toEqual([]);expect(s.recentAttempts[0].attemptId).toBe('fake');
  });
  test('chunk limits use tokenizer counts and retain section headings',async()=>{
    const count=jest.fn(async(text:string)=>text.length);
    const chunks=await chunkSections('Title',[{heading:'Rule',text:'An example sentence. '.repeat(80)}],count);
    expect(chunks.length).toBeGreaterThan(1);expect(chunks.every(c=>c.tokenCount<=600&&c.content.startsWith('Title\nRule\n'))).toBe(true);
    await expect(chunkSections('Title',[{heading:'Rule',text:'x'.repeat(1000)}],count)).rejects.toThrow('SECTION_TOO_LONG');
  });
  test('another user or an unfinished result cannot reach result services',async()=>{
    const result=jest.fn();const query=jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{status:'IN_PROGRESS'}]);
    const context=new ChatbotContext({query} as any,{result} as any,{result} as any);
    for(let i=0;i<2;i++)await expect(context.review({id:'me'} as any,'attempt')).rejects.toThrow();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('student_id=$2'),['attempt','me']);expect(result).not.toHaveBeenCalled();
  });
  test('Gemini tool round preserves thought signature and call id verbatim',async()=>{
    const toolContent={role:'model',parts:[{functionCall:{name:'searchKnowledge',id:'call-1',args:{query:'Aptis General Writing part 4'}},thoughtSignature:'opaque-signature'}]};
    const generate=jest.fn().mockResolvedValueOnce(toolContent).mockResolvedValueOnce({role:'model',parts:[{text:JSON.stringify({text:'Answer',citationIds:['source'],actions:[]})}]});
    const finish=jest.fn(),repo={db:{manager:{}},begin:async()=>({fresh:true,session:{id:'s'},reply:{id:'m',sequence:2}}),history:async()=>[{role:'user',content:'Question'}],finish,expire:async()=>{},message:async()=>({status:'COMPLETED'}),fail:jest.fn()};
    const service=new ChatbotService(repo as any,{assertReady:()=>{},generate} as any,{} as any,{search:async()=>({sources:[{id:'source',title:'Known source',content:'Fact'}]})} as any,{} as any);
    await service.send({id:'u'} as any,'s',{clientMessageId:'c',content:'Question'});
    expect(generate.mock.calls[1][1][1]).toBe(toolContent);
    expect(generate.mock.calls[1][1][2].parts[0].functionResponse.id).toBe('call-1');expect(finish).toHaveBeenCalledWith('m','Answer',expect.any(Array),[],expect.any(Object));
  });
});
