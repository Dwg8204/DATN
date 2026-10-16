import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TestAttemptsService } from '../test-attempts/services/test-attempts.service';
import { PracticeAttemptsService } from '../test-attempts/services/practice-attempts.service';
import { AuthUser } from '../auth/types/auth-user.type';
import { chatError } from './chatbot.repository';

export function learningStats(rows:any[]) {
  const groups=new Map<string,any>();
  const weaknesses=new Map<string,{criterion:string;observations:number;needsImprovement:number}>();
  for(const a of rows) {
    const groupKey=[a.component,a.purpose,a.scope,a.part_number??'full'].join(':');
    const g=groups.get(groupKey)??{component:a.component,purpose:a.purpose,scope:a.scope,partNumber:a.part_number,sampleSize:0,recentScores:[],parts:{},speakingCriteria:[]};
    g.sampleSize++;
    groups.set(groupKey,g);
    if(['SIMULATED','UNASSESSED','PENDING_AI'].includes(a.result?.method))continue;
    if(a.score!=null&&a.max_score>0 && !['SIMULATED','UNASSESSED','PENDING_AI'].includes(a.result?.method)) g.recentScores.push({attemptId:a.id,date:a.submitted_at,score:Number(a.score),maxScore:Number(a.max_score)});
    for(const p of a.result?.parts??[]) if(p.maxScore>0 && p.score!=null) {
      const part=g.parts[p.partNumber]??{partNumber:p.partNumber,earned:0,possible:0,attempts:0};
      part.earned+=p.score;part.possible+=p.maxScore;part.attempts++;g.parts[p.partNumber]=part;
    }
    for(const p of a.result?.writing?.details?.parts??[]) for(const q of p.questions??[]) for(const c of q.criteria??[]) {
      if(!['STRONG','ADEQUATE','NEEDS_IMPROVEMENT'].includes(c.judgment)) continue;
      const key=`${groupKey}:${c.criterion}`;
      const w=weaknesses.get(key)??{criterion:c.criterion,observations:0,needsImprovement:0};
      w.observations++;if(c.judgment==='NEEDS_IMPROVEMENT')w.needsImprovement++;weaknesses.set(key,w);
    }
    if(a.result?.speaking?.provider==='LLM')g.speakingCriteria.push({attemptId:a.id,version:a.result.speaking.version,date:a.submitted_at,percentages:a.result.speaking.criteria});
    groups.set(groupKey,g);
  }
  return {attemptsConsidered:rows.length,recentAttempts:rows.map(a=>({attemptId:a.id,component:a.component,purpose:a.purpose,scope:a.scope,partNumber:a.part_number,date:a.submitted_at,method:a.result?.method})),groups:[...groups].map(([key,g])=>({...g,
    parts:Object.values(g.parts).map((p:any)=>({...p,percent:Math.round(p.earned/p.possible*100)})).sort((a:any,b:any)=>a.percent-b.percent),
    writingCriteria:[...weaknesses].filter(([k])=>k.startsWith(`${key}:`)).map(([,v])=>v).sort((a,b)=>b.needsImprovement/b.observations-a.needsImprovement/a.observations)})),
    limitation:'Chỉ mô tả tối đa 20 bài đã nộp gần nhất; không gộp điểm khác kỹ năng/chế độ/phạm vi hoặc suy CEFR tổng thể.'};
}
@Injectable()
export class ChatbotContext {
  constructor(private readonly db:DataSource,private readonly exams:TestAttemptsService,private readonly practice:PracticeAttemptsService) {}
  async review(actor:AuthUser,attemptId:string,questionKey?:string) {
    const [a]=await this.db.query(`SELECT id,purpose,part_number,assessment_revision,status FROM test_attempts WHERE id=$1 AND student_id=$2`,[attemptId,actor.id]);
    if(!a || a.status!=='SUBMITTED')throw chatError('CHAT_RESULT_UNAVAILABLE',404);
    const service=a.purpose==='PRACTICE'?this.practice:this.exams;
    const summary:any=await service.result(attemptId,actor);
    const part=questionKey?Number(/^p([1-4]):q\d{1,3}$/.exec(questionKey)?.[1]):a.part_number;
    if(questionKey&&!part)throw chatError('CHAT_CONTEXT_INVALID',400);
    const detail:any=part?await service.details(attemptId,part,actor):null;
    if(questionKey&&!detail.items.some((i:any)=>i.key===questionKey)) throw chatError('CHAT_CONTEXT_INVALID',400);
    // Allow-list result fields; audio URLs and account information are never sent to the provider.
    const data={attemptId,questionKey:questionKey??null,assessmentRevision:a.assessment_revision,
      title:summary.title,component:summary.component,purpose:a.purpose,scope:summary.scope,
      gradingStatus:summary.gradingStatus,score:summary.score,maxScore:summary.maxScore,estimatedCefr:summary.estimatedCefr,
      parts:summary.result?.parts,writing:summary.result?.writing,
      speaking:summary.result?.speaking?{provider:summary.result.speaking.provider,criteria:summary.result.speaking.criteria,cefrReason:summary.result.speaking.cefrReason,partFeedback:summary.result.speaking.partFeedback}:null,
      detail:detail?{partNumber:part,paper:detail.paper,items:detail.items.filter((i:any)=>!questionKey||i.key===questionKey),writing:detail.writing}:null};
    return redactMedia(data);
  }
  async stats(actor:AuthUser) {
    const rows=await this.db.query(`SELECT id,component,purpose,scope,part_number,score,max_score,submitted_at,result FROM test_attempts
      WHERE student_id=$1 AND status='SUBMITTED' ORDER BY submitted_at DESC,id DESC LIMIT 20`,[actor.id]);
    return learningStats(rows);
  }
}
function redactMedia(value:any):any {
  if(Array.isArray(value))return value.map(redactMedia);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!/audio|image|url|media|avatar|email/i.test(k)).map(([k,v])=>[k,redactMedia(v)]));
  return value;
}
