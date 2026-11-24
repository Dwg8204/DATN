import 'reflect-metadata';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { withPersonalizationDatabase } from './personalization-fixture';
import { AddMistakeExplanations1760000025000 } from '../../src/database/migrations/1760000025000-AddMistakeExplanations';
import { MistakeExplanationService } from '../../src/features/personalization/services/mistake-explanation.service';
import { AiRequestRecorder } from '../../src/features/ai-shared/ai-request-recorder.service';
import { EXPLAIN_PROMPT_VERSION } from '../../src/features/personalization/ai/explanation.contract';
withPersonalizationDatabase(async (db, alice, bob) => {
  const runner = db.createQueryRunner();
  await runner.connect();
  const migration = new AddMistakeExplanations1760000025000();
  await migration.down(runner);
  await migration.up(runner);
  await runner.release();
  const test = randomUUID(),
    snapshot = randomUUID(),
    attempt = randomUUID(),
    doc = randomUUID(),
    chunk = randomUUID();
  await db.query(
    "INSERT INTO tests(id,created_by,title,component,scope,part_number,purpose) VALUES($1,$2,'R2 fixture','READING','PART',1,'PRACTICE')",
    [test, alice],
  );
  await db.query(
    "INSERT INTO test_snapshots(id,test_id,version,schema_version,snapshot,content_hash) VALUES($1,$2,1,1,'{}','r2-fixture')",
    [snapshot, test],
  );
  await db.query(
    `INSERT INTO test_attempts(id,student_id,snapshot_id,component,scope,part_number,status,purpose,result)
 VALUES($1,$2,$3,'READING','PART',1,'SUBMITTED','PRACTICE','{"method":"OBJECTIVE"}')`,
    [attempt, alice, snapshot],
  );
  await db.query(
    `INSERT INTO knowledge_documents(id,document_key,version_no,title,document_type,component,language_code,access_scope,status,content_hash,rights_note,created_by,metadata,usage)
 VALUES($1,'r2-fixture',1,'Days','AUTHORED_SUMMARY','READING','vi','LEARNER','READY','hash','fixture',$2,'{"examVariant":"ENGLISH"}','LESSON')`,
    [doc, alice],
  );
  await db.query(
    `INSERT INTO knowledge_chunks(id,document_id,chunk_index,content,content_hash,search_vector) VALUES($1,$2,0,'Use on with weekdays.','hash',to_tsvector('simple','Use on with weekdays.'))`,
    [chunk, doc],
  );
  const item = {
    key: 'p1:q1',
    correctAnswer: 'a',
    selectedAnswer: { optionId: 'b' },
    explanation: 'On đi với ngày trong tuần.',
    outcome: { outcome: 'INCORRECT' },
  };
  const details: any = {
    details: async () => ({
      component: 'READING',
      partNumber: 1,
      paper: {
        questions: [
          {
            key: 'p1:q1',
            text: 'Meet ___ Monday.',
            options: [
              { id: 'a', text: 'on' },
              { id: 'b', text: 'at' },
            ],
          },
        ],
      },
      items: [item],
    }),
  };
  let noLesson = false,
    calls = 0;
  const knowledge: any = {
    search: async () =>
      noLesson
        ? []
        : [{ chunkId: chunk, title: 'Days', content: 'Use on with weekdays.' }],
  };
  const recorder = new AiRequestRecorder(db);
  const generation: any = {
    generate: async (input: any) => {
      calls++;
      const id = await recorder.start(input, { fixture: true });
      await recorder.complete(id, {
        promptTokenCount: 10,
        candidatesTokenCount: 10,
      });
      return {
        requestId: id,
        text: JSON.stringify({
          locale: 'vi',
          correctAnswer: 'on',
          explanation: 'Dùng on trước ngày trong tuần.',
          ruleSummary: 'On đi với ngày.',
          tip: 'Nhớ on Monday.',
          citations: [chunk],
        }),
      };
    },
  };
  const config = new ConfigService({
    PERSONALIZATION_RAG_ENABLED: true,
    RAG_EXPLAIN_DAILY_LIMIT: 2,
  });
  const service = new MistakeExplanationService(
    db,
    config,
    details,
    knowledge,
    generation,
    recorder,
  );
  const actor: any = { id: alice, role: 'STUDENT' };
  await assert.rejects(
    service.explain({ ...actor, id: bob }, attempt, 'p1:q1', 'vi'),
    (e: any) => e.code === 'MISTAKE_SOURCE_UNAVAILABLE',
  );
  const answers = await Promise.all([
    service.explain(actor, attempt, 'p1:q1', 'vi'),
    service.explain(actor, attempt, 'p1:q1', 'vi'),
  ]);
  assert.equal(calls, 1);
  assert.equal(answers[0].status, 'READY');
  assert.equal(answers[0].sources[0].chunkId, chunk);
  const [validationRow] = await db.query("SELECT config_snapshot FROM ai_requests WHERE purpose='PERSONAL_EXPLAIN'");
  assert.deepEqual(validationRow.config_snapshot.validation, {attempt:1,valid:true,issues:[]});
  assert.equal(
    (await db.query('SELECT * FROM mistake_explanations')).length,
    1,
  );
  await assert.rejects(
    db.query(
      `INSERT INTO mistake_explanations(user_id,attempt_id,assessment_revision,question_key,locale,prompt_version,status,content)
 VALUES($1,$2,0,'p1:q1','vi',$3,'FALLBACK','{}')`,
      [alice, attempt, EXPLAIN_PROMPT_VERSION],
    ),
    (e: any) => e.code === '23505',
  );
  // Cross-instance reservations cannot exceed the per-user/day limit.
  const reservations = await Promise.all(
    Array.from({ length: 5 }, () =>
      db.query(
        `INSERT INTO mistake_explanation_usage(user_id,usage_day,calls) VALUES($1,(now() AT TIME ZONE 'UTC')::date,1)
 ON CONFLICT(user_id,usage_day) DO UPDATE SET calls=mistake_explanation_usage.calls+1 WHERE mistake_explanation_usage.calls<2 RETURNING calls`,
        [alice],
      ),
    ),
  );
  assert.equal(reservations.flat().length, 1);
  assert.equal(
    (await service.explain(actor, attempt, 'p1:q1', 'vi')).status,
    'READY',
  );
  assert.equal(calls, 1);
  await db.query('UPDATE test_attempts SET assessment_revision=1 WHERE id=$1', [
    attempt,
  ]);
  assert.equal(
    (await service.explain(actor, attempt, 'p1:q1', 'vi')).notice,
    'EXPLAIN_LIMIT_REACHED',
  );
  await db.query('DELETE FROM mistake_explanation_usage WHERE user_id=$1', [
    alice,
  ]);
  noLesson = true;
  assert.equal(
    (await service.explain(actor, attempt, 'p1:q1', 'vi')).notice,
    'NO_LESSON',
  );
  assert.equal(
    (await db.query("SELECT * FROM retrieval_gaps WHERE feature='EXPLAIN'"))
      .length,
    1,
  );
  await db.query('DELETE FROM test_attempts WHERE id=$1', [attempt]);
  assert.equal(
    (await db.query('SELECT * FROM mistake_explanations')).length,
    0,
  );
  await db.query(
    'INSERT INTO mistake_explanation_usage VALUES($1,current_date,1)',
    [bob],
  );
  await db.query('DELETE FROM users WHERE id=$1', [bob]);
  assert.equal(
    (
      await db.query(
        'SELECT * FROM mistake_explanation_usage WHERE user_id=$1',
        [bob],
      )
    ).length,
    0,
  );
  console.log(
    'PASS R2 DB: migration up/down/up, ownership, cache uniqueness, concurrent opens, atomic daily quota, revision isolation, gaps and cascade.',
  );
}).catch((e) => {
  console.error('R2 DB failed:', e.message);
  process.exitCode = 1;
});
