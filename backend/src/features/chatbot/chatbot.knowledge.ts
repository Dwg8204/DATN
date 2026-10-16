import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ChatbotProvider } from './chatbot.provider';

export function reciprocalRankFusion(lists: Array<Array<{id:string;[key:string]:any}>>,limit=6) {
  const scores=new Map<string,{row:any;score:number}>();
  for(const list of lists) list.forEach((row,i)=>{const previous=scores.get(row.id);scores.set(row.id,{row,score:(previous?.score??0)+1/(60+i+1)});});
  return [...scores.values()].sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.row);
}
@Injectable()
export class ChatbotKnowledge {
  constructor(private readonly db: DataSource,private readonly provider: ChatbotProvider) {}
  async search(query:string,signal:AbortSignal) {
    const [{count}]=await this.db.query(`SELECT count(*)::int AS count FROM knowledge_documents WHERE status='READY' AND access_scope='LEARNER' AND metadata->>'examVariant' IN ('APTIS_ESOL_GENERAL','ENGLISH')`);
    if(!count) return {sources:[],notice:'Kho tài liệu đang được chuẩn bị. Không khẳng định quy định Aptis khi chưa có nguồn.'};
    const vector=await this.provider.embed(query,true,signal);
    const select=`SELECT c.id,c.content,d.title,d.source_uri AS url,c.location FROM knowledge_chunks c JOIN knowledge_documents d ON d.id=c.document_id
      WHERE d.status='READY' AND d.access_scope='LEARNER' AND d.metadata->>'examVariant' IN ('APTIS_ESOL_GENERAL','ENGLISH')
      AND NOT EXISTS(SELECT 1 FROM knowledge_documents newer WHERE newer.document_key=d.document_key AND newer.version_no>d.version_no AND newer.status='READY')`;
    const [semantic,lexical]=await Promise.all([
      this.db.query(`${select} AND c.embedding_model='gemini-embedding-001' AND c.embedding IS NOT NULL ORDER BY c.embedding <=> $1::vector LIMIT 10`,[JSON.stringify(vector)]),
      this.db.query(`${select} AND c.search_vector @@ plainto_tsquery('simple',$1) ORDER BY ts_rank_cd(c.search_vector,plainto_tsquery('simple',$1)) DESC LIMIT 10`,[query]),
    ]);
    return {sources:reciprocalRankFusion([semantic,lexical])};
  }
}
