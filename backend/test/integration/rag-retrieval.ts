import 'reflect-metadata';
import * as assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { withPersonalizationDatabase } from './personalization-fixture';
import { AddRagRetrievalStores1760000024000 } from '../../src/database/migrations/1760000024000-AddRagRetrievalStores';
import { QuestionEmbeddingWorker } from '../../src/features/retrieval/question-embedding.worker';
import { QuestionSearchService } from '../../src/features/retrieval/question-search.service';
import { KnowledgeSearchService } from '../../src/features/retrieval/knowledge-search.service';
import { normalizeEmbedding } from '../../src/features/retrieval/embedding.service';
const vector = (s: string) => {
  const b = createHash('sha256').update(s).digest();
  return normalizeEmbedding(
    Array.from({ length: 768 }, (_, i) => b[i % 32] / 255),
  );
};
withPersonalizationDatabase(async (db, alice) => {
  const migration = new AddRagRetrievalStores1760000024000(),
    runner = db.createQueryRunner();
  await runner.connect();
  await migration.down(runner);
  await migration.up(runner);
  await runner.release();
  let calls = 0;
  const embed = {
    embedMany: async (texts: string[]) => {
      calls++;
      return texts.map(vector);
    },
    embed: async (text: string) => vector(text),
  };
  const worker = new QuestionEmbeddingWorker(
    db,
    embed as any,
    new ConfigService({ PERSONALIZATION_RAG_ENABLED: true }),
  );
  const testId = randomUUID();
  await db.query(
    "INSERT INTO tests(id,created_by,title,component,scope,part_number,purpose) VALUES($1,$2,'RAG fixture','READING','PART',1,'PRACTICE')",
    [testId, alice],
  );
  const [q] = await db.query(
    `INSERT INTO questions(test_id,part_number,position,question_type,content,correct_answer) VALUES($1,1,1,'READING_GAP_CHOICE','{"text":"Meet on Monday","options":["on","in"]}','{"answer":"on"}') RETURNING id`,
    [testId],
  );
  const publish = async (version: number) => {
    const [s] = await db.query(
      "INSERT INTO test_snapshots(test_id,version,schema_version,snapshot,content_hash) VALUES($1,$2,1,'{}',$3) RETURNING id",
      [testId, version, `hash-${version}`],
    );
    await db.query(
      "UPDATE tests SET status='PUBLISHED',published_snapshot_id=$2 WHERE id=$1",
      [testId, s.id],
    );
    return s.id;
  };
  await publish(1);
  assert.equal(
    (
      await db.query('SELECT * FROM question_embedding_jobs WHERE test_id=$1', [
        testId,
      ])
    ).length,
    1,
  );
  await Promise.all([worker.processOne(), worker.processOne()]);
  assert.equal(calls, 1);
  await worker.runBatch();
  assert.equal(calls, 1);
  const [embedded] = await db.query(
    'SELECT embedding::text vector FROM question_embeddings WHERE question_id=$1',
    [q.id],
  );
  const search = new QuestionSearchService(db);
  const v = JSON.parse(embedded.vector);
  assert.equal(
    (await search.similar([v], { component: 'READING', minSimilarity: 0.99 }))
      .length,
    1,
  );
  assert.equal(
    (await search.similar([v], { component: 'LISTENING', minSimilarity: 0 }))
      .length,
    0,
  );
  assert.equal(
    (
      await search.similar([v], {
        component: 'READING',
        excludeTestIds: [testId],
      })
    ).length,
    0,
  );
  await db.query('UPDATE questions SET content=$2 WHERE id=$1', [
    q.id,
    { text: 'Meet at noon', options: ['at', 'on'] },
  ]);
  assert.equal(
    (await search.similar([v], { component: 'READING', minSimilarity: 0 }))
      .length,
    0,
    'stale draft hash excluded',
  );
  await publish(2);
  await worker.runBatch();
  assert.equal(calls, 2);
  assert.equal(
    (
      await db.query('SELECT * FROM question_embeddings WHERE question_id=$1', [
        q.id,
      ])
    ).length,
    1,
  );
  await db.query(
    "UPDATE tests SET is_placement=true,scope='FULL_SKILL',part_number=NULL WHERE id=$1",
    [testId],
  );
  assert.equal(
    (await search.similar([v], { component: 'READING', minSimilarity: 0 }))
      .length,
    0,
    'placement excluded',
  );
  await db.query('UPDATE tests SET is_placement=false WHERE id=$1', [testId]);
  const [copy] = await db.query(
    `INSERT INTO questions(test_id,part_number,position,question_type,content,correct_answer)
    SELECT test_id,part_number,2,question_type,content,correct_answer FROM questions WHERE id=$1 RETURNING id`,
    [q.id],
  );
  await publish(3);
  await worker.runBatch();
  assert.equal(
    calls,
    2,
    'identical input reuses a real stored vector without another provider call',
  );
  assert.equal(
    (
      await db.query(
        'SELECT question_id FROM question_embeddings WHERE question_id=$1',
        [copy.id],
      )
    ).length,
    1,
  );
  const doc = randomUUID(),
    chunk = randomUUID();
  await db.query(
    `INSERT INTO knowledge_documents(id,document_key,version_no,title,document_type,component,language_code,access_scope,status,content_hash,rights_note,created_by,metadata,topic_codes,usage)
 VALUES($1,'rag-test',1,'Article rule','AUTHORED_SUMMARY','READING','vi','LEARNER','READY','hash','fixture',$2,'{"examVariant":"ENGLISH"}',ARRAY['reading-detail'],'LESSON')`,
    [doc, alice],
  );
  await db.query(
    `INSERT INTO knowledge_chunks(id,document_id,chunk_index,content,content_hash,embedding,embedding_model,search_vector)
 VALUES($1,$2,0,'Monday article rule','hash',$3::vector,'gemini-embedding-001',to_tsvector('simple','Monday article rule'))`,
    [chunk, doc, JSON.stringify(vector('Monday'))],
  );
  const knowledge = new KnowledgeSearchService(db, embed as any);
  assert.equal(
    (
      await knowledge.search('Monday', {
        component: 'READING',
        topicCodes: ['reading-detail'],
        usage: 'LESSON',
        part: 1,
        minSimilarity: 0.9,
      })
    )[0].id,
    chunk,
  );
  assert.equal(
    (await knowledge.search('Monday', {})).length,
    1,
    'chatbot unfiltered path works',
  );
  assert.equal(
    (await knowledge.search('Monday', { component: 'WRITING' })).length,
    0,
  );
  await db.query(
    "UPDATE knowledge_documents SET access_scope='STAFF' WHERE id=$1",
    [doc],
  );
  assert.equal(
    (await knowledge.search('Monday')).length,
    0,
    'admin sources excluded',
  );
  console.log(
    'PASS RAG DB: migrations up/down/up, publication trigger, concurrency, idempotency, hash invalidation, placement exclusions, hybrid filters and access scope.',
  );
}).catch((error) => {
  console.error('RAG DB test failed:', error.message);
  process.exitCode = 1;
});
