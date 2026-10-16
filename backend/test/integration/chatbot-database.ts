import 'reflect-metadata';
import 'dotenv/config';
import assert = require('node:assert/strict');
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { resolve } from 'node:path';
import { ChatbotRepository } from '../../src/features/chatbot/chatbot.repository';
import { ConfigService } from '@nestjs/config';
import { ChatbotProvider } from '../../src/features/chatbot/chatbot.provider';
import { ChatbotService } from '../../src/features/chatbot/chatbot.service';
import { ChatbotKnowledge } from '../../src/features/chatbot/chatbot.knowledge';
import { ChatbotContext } from '../../src/features/chatbot/chatbot.context';

async function main() {
  const url=new URL(process.env.TEST_DATABASE_URL??process.env.DATABASE_URL??'');
  if(!process.env.TEST_DATABASE_URL) {
    if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('Use a dedicated local test database');
    const provision=new DataSource({type:'postgres',url:url.toString(),logging:false});await provision.initialize();
    try {if(!(await provision.query("SELECT 1 FROM pg_database WHERE datname='aptimate_chatbot_test'")).length)await provision.query('CREATE DATABASE aptimate_chatbot_test');}
    finally{await provision.destroy();}
    url.pathname='/aptimate_chatbot_test';
  }
  if(!decodeURIComponent(url.pathname).endsWith('_test'))throw Error('Database must end in _test');
  const schema=`chat_test_${randomUUID().replace(/-/g,'')}`;
  const admin=new DataSource({type:'postgres',url:url.toString(),logging:false});await admin.initialize();
  await admin.query('CREATE EXTENSION IF NOT EXISTS vector');
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const db=new DataSource({type:'postgres',url:url.toString(),schema,logging:false,
    extra:{options:`-c search_path=${schema},public`,max:6},migrations:[resolve(__dirname,'../../src/database/migrations/*.ts')]});
  try {
    await db.initialize();await db.runMigrations();
    const repo=new ChatbotRepository(db),alice=randomUUID(),bob=randomUUID(),s=randomUUID(),other=randomUUID();
    await db.query("INSERT INTO roles(code,name) VALUES('STUDENT','Student') ON CONFLICT DO NOTHING");
    for(const id of [alice,bob])await db.query(`INSERT INTO users(id,email,password_hash,first_name,last_name,role_id,status)
      SELECT $1,$2,'test-only','Test','Chat',id,'ACTIVE' FROM roles WHERE code='STUDENT'`,[id,`${id}@example.invalid`]);
    await repo.create(alice,s);await repo.create(bob,other);
    await assert.rejects(repo.messages(bob,s,1));await assert.rejects(repo.rename(bob,s,'hijack'));await assert.rejects(repo.remove(bob,s));
    const client=randomUUID();
    const turns=await Promise.all([repo.begin(alice,s,client,'Hello'),repo.begin(alice,s,client,'Hello')]);
    assert.equal(turns.filter(t=>t.fresh).length,1);assert.equal(turns[0].reply.id,turns[1].reply.id);
    await assert.rejects(repo.begin(alice,s,client,'Changed'));
    await assert.rejects(repo.begin(alice,s,randomUUID(),'While pending'));
    await db.query("UPDATE chat_messages SET created_at=now()-interval '91 seconds' WHERE id=$1",[turns[0].reply.id]);
    assert.equal((await repo.messages(alice,s,1)).items.at(-1).status,'FAILED');
    const retry=await repo.retry(alice,s,turns[0].reply.id);assert.ok(retry.fresh);
    await repo.finish(turns[0].reply.id,'Late',[],[],{});assert.equal((await repo.message(turns[0].reply.id)).status,'FAILED');
    await repo.finish(retry.reply.id,'Recovered',[],[],{});
    assert.equal((await repo.messages(alice,s,1)).items.filter((m:any)=>m.role==='user').length,1);
    await repo.feedback(alice,s,retry.reply.id,1);assert.equal((await repo.message(retry.reply.id)).feedback,1);
    await assert.rejects(repo.feedback(bob,s,retry.reply.id,-1));
    await assert.rejects(db.query(`INSERT INTO chat_messages(session_id,sequence_no,role,content,status,reply_to_id) VALUES($1,1,'ASSISTANT','cross','COMPLETED',$2)`,[other,turns[0].reply.id]));
    const pending=await repo.begin(alice,s,randomUUID(),'Delete during response');await repo.remove(alice,s);
    await repo.finish(pending.reply.id,'Must not publish',[],[],{});assert.equal((await repo.message(pending.reply.id)).status,'FAILED');
    assert.equal((await repo.sessions(alice,1)).items.length,0);
    for(let n=0;n<22;n++)await repo.create(bob,randomUUID());
    const p1=await repo.sessions(bob,1),p2=await repo.sessions(bob,2);assert.equal(p1.items.length,20);assert.ok(p1.hasMore);assert.equal(p2.items.length,3);
    assert.ok(!p2.items.some((x:any)=>p1.items.some((y:any)=>x.id===y.id)));
    if(process.argv.includes('--live')){
      // Generation logs stay in the isolated test DB. Only public knowledge is read from local app DB.
      const knowledgeDb=new DataSource({type:'postgres',url:process.env.DATABASE_URL,logging:false});await knowledgeDb.initialize();
      try{
        const provider=new ChatbotProvider(new ConfigService({...process.env,CHATBOT_ENABLED:'true'}),db);
        const knowledge=new ChatbotKnowledge(knowledgeDb,provider);
        const context=new ChatbotContext(db,{} as any,{} as any);
        const chat=new ChatbotService(repo,provider,context,knowledge,{lookup:async()=>({error:'NOT_IN_THIS_TEST'})} as any);
        const actor={id:bob} as any;
        for(const [prompt,citation] of [['Trong AptiMate tôi tạo flashcard ở đâu?',false],['Aptis ESOL General Writing part 4 viết bao nhiêu từ? Dẫn nguồn giúp tôi.',true],['Dựa trên kết quả của tôi, tôi nên ôn gì?',false]] as const){
          const session=randomUUID();await chat.create(actor,{id:session});
          const answer=await chat.send(actor,session,{clientMessageId:randomUUID(),content:prompt});
          assert.equal(answer.status,'COMPLETED',answer.errorCode);if(citation)assert.ok(answer.citations.some((c:any)=>c.url==='https://www.britishcouncil.org/exam/aptis/take-test/writing-video'),'Expected Writing source');
          console.log(JSON.stringify({live:'PASS',prompt,answer:answer.content,citations:answer.citations?.length??0}));
        }
        const followupSession=randomUUID();await chat.create(actor,{id:followupSession});
        for(const prompt of ['Giải thích ngắn gọn cách dùng since và for, kèm một ví dụ mỗi từ.','Cho thêm hai ví dụ với hai từ vừa nói, chủ đề học tiếng Anh.']){
          const answer=await chat.send(actor,followupSession,{clientMessageId:randomUUID(),content:prompt});
          assert.equal(answer.status,'COMPLETED',answer.errorCode);assert.match(answer.content,/since/i);assert.match(answer.content,/for/i);
          console.log(JSON.stringify({live:'PASS',prompt,answer:answer.content}));
        }
        const [usage]=await db.query("SELECT count(*)::int AS calls,sum(input_tokens)::int AS input,sum(output_tokens)::int AS output FROM ai_requests WHERE purpose='CHAT'");
        console.log(JSON.stringify({liveUsage:usage}));
      }finally{await knowledgeDb.destroy();}
    }
    console.log('PASS: all migrations, ownership, concurrent idempotency, stale recovery, late response, feedback, same-session FK, soft deletion and pagination.');
  } finally {
    if(db.isInitialized)await db.destroy();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);await admin.destroy();
  }
}
main().catch(e=>{console.error('Chat database test failed:',e?.code??e?.name,e?.query?'SQL statement failed':e?.message);if(e?.driverError?.message)console.error(e.driverError.message);process.exitCode=1;});
