import 'reflect-metadata';
import 'dotenv/config';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {ConfigService} from '@nestjs/config';
import {DataSource} from 'typeorm';
import {createDataSourceOptions} from '../src/database/data-source-options';
import {ChatbotProvider} from '../src/features/chatbot/chatbot.provider';
import {createGeminiServices} from '../src/features/ai-shared/create-gemini-services';
import {chunkSections} from '../src/features/chatbot/knowledge-chunker';
import { KnowledgeDocument, validateCorpus, importableDocument } from '../src/features/retrieval/knowledge-corpus';
import { EmbeddingService } from '../src/features/retrieval/embedding.service';
import { AiRequestRecorder } from '../src/features/ai-shared/ai-request-recorder.service';
import { AiProviderError } from '../src/features/ai-shared/ai-provider.error';

type Document=KnowledgeDocument;
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function main(){
  const docs:Document[]=JSON.parse(readFileSync(resolve(__dirname,'../resources/chatbot-knowledge/corpus.json'),'utf8'));
  validateCorpus(docs);
  const keys=new Set<string>();
  for(const d of docs){
    if(!/^[a-z0-9-]{1,150}$/.test(d.key)||keys.has(d.key)||!d.title||d.title.length>255||!['APTIS_ESOL_GENERAL','ENGLISH'].includes(d.variant)
      ||!/^\d{4}-\d{2}-\d{2}$/.test(d.verifiedAt)||!d.sections?.length||d.sections.some(s=>!s.heading||!s.text.trim()))throw Error('INVALID_CORPUS');
    if(d.source&&new URL(d.source).protocol!=='https:')throw Error('INVALID_SOURCE');
    if(d.variant==='APTIS_ESOL_GENERAL'&&!d.source)throw Error('APTIS_REQUIRES_SOURCE');
    keys.add(d.key);
  }
  console.log(JSON.stringify({documents:docs.length,sections:docs.reduce((n,d)=>n+d.sections.length,0),structure:'valid'}));
  if(!process.argv.includes('--apply')){console.log('Offline validation only. Exact token counts and embeddings are checked on import.');return;}
  if(docs.some(d=>!importableDocument(d)))throw Error('UNREVIEWED_CORPUS: resolve every draft before import');
  const db=new DataSource({...createDataSourceOptions(),logging:false});await db.initialize();
  const config=new ConfigService({...process.env,CHATBOT_ENABLED:'true'});
  const {client,generation}=createGeminiServices(config,db);
  const provider=new ChatbotProvider(config,client,generation);provider.assertReady();
  const embeddings=new EmbeddingService(client,new AiRequestRecorder(db));
  const retry=async<T>(operation:()=>Promise<T>):Promise<T>=>{
    for(let attempt=0;;attempt++)try{return await operation();}catch(error){
      if(!(error instanceof AiProviderError)||!['QUOTA','TIMEOUT','UNAVAILABLE'].includes(error.reason)||attempt>=4)throw error;
      const delay=Math.min(120000,Math.max(1000,error.retryAfterMs??15000));
      console.log(`Embedding retry ${attempt+1}: ${error.reason}, ${delay}ms`);
      await new Promise(resolve=>setTimeout(resolve,delay));
    }
  };
  const lock=db.createQueryRunner();await lock.connect();
  try{
    const [locked]=await lock.query("SELECT pg_try_advisory_lock(hashtextextended('aptimate-knowledge-import',0)) AS ok");
    if(!locked.ok)throw Error('IMPORT_ALREADY_RUNNING');
    const [actor]=await db.query("SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE r.code='ADMIN' AND u.status='ACTIVE' ORDER BY u.created_at LIMIT 1");
    if(!actor)throw Error('An active admin is required to own imported documents');
    const topicRows=await db.query('SELECT code FROM learning_topics WHERE is_active');
    const topicCodes=new Set(topicRows.map((r:{code:string})=>r.code));
    if(docs.some(d=>d.topicCodes?.some(code=>!topicCodes.has(code))))throw Error('UNKNOWN_TOPIC_CODE');
    const [columns]=await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='knowledge_documents' AND column_name='usage'");
    for(const d of docs){
      const digest=hash({document:d,chunker:'section-token-v1',embedding:'gemini-embedding-001:768'});
      const [latest]=await db.query('SELECT id,version_no,content_hash,status FROM knowledge_documents WHERE document_key=$1 ORDER BY version_no DESC LIMIT 1',[d.key]);
      if(latest?.content_hash===digest&&latest.status==='READY'){console.log(`${d.key}: unchanged`);continue;}
      const chunks=await chunkSections(d.title,d.sections,text=>retry(()=>embeddings.count(text,AbortSignal.timeout(30000))));
      const vectors=await retry(()=>embeddings.embedMany(chunks.map(c=>c.content),AbortSignal.timeout(90000),actor.id));
      await db.transaction(async m=>{
        const [document]=await m.query(`INSERT INTO knowledge_documents(document_key,version_no,title,source_uri,document_type,component,language_code,access_scope,status,content_hash,rights_note,created_by,metadata)
          VALUES($1,$2,$3,$4,'AUTHORED_SUMMARY',$5,'vi','LEARNER','PROCESSING',$6,$7,$8,$9) RETURNING id`,
          [d.key,(latest?.version_no??0)+1,d.title,d.source,d.component??null,digest,
            d.source?'Short paraphrased factual summary with source attribution; no copied exam questions.':'Original AptiMate explanatory text and examples; editorial review before wider release.',actor.id,
            JSON.stringify({examVariant:d.variant,verifiedAt:d.verifiedAt,corpusStage:'R0_REVIEWED',tokenizer:'gemini-embedding-001',usage:d.usage??'GENERAL',topicCodes:d.topicCodes??[],part:d.part??null,criterion:d.criterion??null,reviewStatus:d.reviewStatus??'LEGACY',review:d.review??null})]);
        await m.query('UPDATE knowledge_documents SET part_number=$2 WHERE id=$1',[document.id,d.part??null]);
        if(columns.n)await m.query('UPDATE knowledge_documents SET usage=$2,topic_codes=$3,criterion=$4 WHERE id=$1',[document.id,d.usage??'GENERAL',d.topicCodes??[],d.criterion??null]);
        for(let i=0;i<chunks.length;i++){
          const c=chunks[i];await m.query(`INSERT INTO knowledge_chunks(document_id,chunk_index,content,location,content_hash,embedding,embedding_model,embedding_version,search_vector,token_count,chunker_version)
            VALUES($1,$2,$3,$4,$5,$6::vector,'gemini-embedding-001','768-normalized-v1',to_tsvector('simple',$3),$7,'section-token-v1')`,
            [document.id,i,c.content,JSON.stringify({heading:c.heading,source:d.source,verifiedAt:d.verifiedAt}),hash(c.content),JSON.stringify(vectors[i]),c.tokenCount]);
        }
        await m.query("UPDATE knowledge_documents SET status='RETIRED' WHERE document_key=$1 AND status='READY'",[d.key]);
        await m.query("UPDATE knowledge_documents SET status='READY' WHERE id=$1",[document.id]);
      });
      console.log(`${d.key}: ready, ${chunks.length} chunks, ${chunks.map(c=>c.tokenCount).join('/')} tokens`);
    }
  }finally{await lock.query("SELECT pg_advisory_unlock(hashtextextended('aptimate-knowledge-import',0))");await lock.release();await db.destroy();}
}
main().catch(e=>{console.error('Knowledge import failed:',e?.code??e?.name,e?.query?'SQL statement failed':e?.message);process.exitCode=1;});
