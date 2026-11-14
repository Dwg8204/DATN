import * as assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import * as request from "supertest";
import { withPersonalizationDatabase } from "./personalization-fixture";
import { AdminRagService } from "../../src/features/retrieval/admin-rag.service";
import { AdminRagController } from "../../src/features/retrieval/admin-rag.controller";
import { QuestionEmbeddingWorker } from "../../src/features/retrieval/question-embedding.worker";
import { PersonalizationWorker } from "../../src/features/personalization/workers/personalization.worker";
import { JwtAuthGuard } from "../../src/features/auth/guards/jwt-auth.guard";
import { createValidationPipe } from "../../src/common/validation/create-validation.pipe";
import { HttpExceptionFilter } from "../../src/common/filters/http-exception.filter";
withPersonalizationDatabase(async (db, alice, bob) => {
  const config = new ConfigService({ PERSONALIZATION_RAG_ENABLED: true }),
    service = new AdminRagService(db, config);
  const mod = await Test.createTestingModule({
    controllers: [AdminRagController],
    providers: [{ provide: AdminRagService, useValue: service }],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate(ctx: any) {
        const req = ctx.switchToHttp().getRequest();
        if (!req.headers["x-role"]) throw new UnauthorizedException();
        req.user = { id: alice, role: req.headers["x-role"] };
        return true;
      },
    })
    .compile();
  const app = mod.createNestApplication({ logger: false });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  const http = app.getHttpServer();
  try {
    for (const endpoint of ["status", "gaps"]) {
      await request(http)
        .get("/admin/rag/" + endpoint)
        .expect(401);
      await request(http)
        .get("/admin/rag/" + endpoint)
        .set("x-role", "STUDENT")
        .expect(403);
    }
    await request(http)
      .post("/admin/rag/reembed")
      .set("x-role", "STUDENT")
      .send({})
      .expect(403);
    for (const query of [
      "pageSize=101",
      "pageSize=0",
      "feature=INVALID",
      "component=INVALID",
      "from=2026-02-30",
      "from=2026-11-02&to=2026-11-01",
    ])
      await request(http)
        .get("/admin/rag/gaps?" + query)
        .set("x-role", "ADMIN")
        .expect(400);
    await request(http)
      .post("/admin/rag/reembed")
      .set("x-role", "ADMIN")
      .send({ component: "INVALID" })
      .expect(400);
    await db.query("UPDATE tests SET archived_at=now()");
    const id = randomUUID();
    await db.query(
      `INSERT INTO tests(id,created_by,title,component,scope,part_number,purpose) VALUES($1,$2,'Public R6 question','READING','PART',1,'PRACTICE')`,
      [id, alice],
    );
    const questions = [];
    for (let i = 0; i < 4; i++) {
      const [q] = await db.query(
        `INSERT INTO questions(test_id,part_number,position,question_type,content,correct_answer) VALUES($1,1,$2,'READING_GAP_CHOICE','{"text":"Meet on Monday","options":["on","in"]}','{"answer":"on"}') RETURNING id`,
        [id, i + 1],
      );
      questions.push(q.id);
    }
    const [snapshot] = await db.query(
      `INSERT INTO test_snapshots(test_id,version,schema_version,snapshot,content_hash) VALUES($1,1,1,'{}','r6') RETURNING id`,
      [id],
    );
    await db.query(
      `UPDATE tests SET status='PUBLISHED',published_snapshot_id=$2 WHERE id=$1`,
      [id, snapshot.id],
    );
    const before = await service.status();
    assert.equal(
      before.coverage.find((c) => c.component === "READING")!.embedded,
      0,
    );
    const doc = randomUUID(),
      chunk = randomUUID();
    await db.query(
      `INSERT INTO learning_topics(code,name,component,topic_type) VALUES('r6-time','R6 time','READING','KNOWLEDGE')`,
    );
    assert.ok(
      (await service.status()).missingTopics.some(
        (t: any) => t.code === "r6-time",
      ),
    );
    await db.query(
      `INSERT INTO knowledge_documents(id,document_key,version_no,title,document_type,component,language_code,access_scope,status,content_hash,rights_note,created_by,metadata,usage,topic_codes) VALUES($1,'r6-lesson',1,'R6 lesson','AUTHORED_SUMMARY','READING','vi','LEARNER','READY','hash','fixture',$2,'{"examVariant":"ENGLISH"}','LESSON',ARRAY['r6-time'])`,
      [doc, alice],
    );
    await db.query(
      `INSERT INTO knowledge_chunks(id,document_id,chunk_index,content,content_hash,search_vector,embedding,embedding_model) VALUES($1,$2,0,'Use on for days','hash',to_tsvector('simple','days'),$3::vector,'gemini-embedding-001')`,
      [chunk, doc, JSON.stringify([1, ...Array(767).fill(0)])],
    );
    assert.ok(
      !(await service.status()).missingTopics.some(
        (t: any) => t.code === "r6-time",
      ),
    );
    await db.query(
      `UPDATE knowledge_documents SET access_scope='STAFF' WHERE id=$1`,
      [doc],
    );
    assert.ok(
      (await service.status()).missingTopics.some(
        (t: any) => t.code === "r6-time",
      ),
    );
    const criteria = (await service.status()).missingCriteria;
    assert.ok(
      criteria.some(
        (c) =>
          c.component === "SPEAKING" && c.criterion === "grammarVocabulary",
      ),
    );
    assert.equal(criteria.filter((c) => c.component === "SPEAKING").length, 4);
    let calls = 0;
    const worker = new QuestionEmbeddingWorker(
      db,
      {
        embedMany: async (texts: string[]) => {
          calls++;
          return texts.map(() => [1, ...Array(767).fill(0)]);
        },
      } as any,
      config,
    );
    await worker.runBatch();
    assert.equal(
      (await service.status()).coverage.find((c) => c.component === "READING")!
        .percent,
      100,
    );
    const runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    await runner.query(
      "SELECT * FROM question_embedding_jobs WHERE test_id=$1 FOR UPDATE",
      [id],
    );
    try {
      assert.equal(
        (await service.reembed(alice, { component: "READING" })).queued,
        0,
        "locked job is skipped without waiting",
      );
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
    const response = await request(http)
      .post("/admin/rag/reembed")
      .set("x-role", "ADMIN")
      .send({ component: "READING" })
      .expect(201);
    assert.equal(response.body.queued, 1);
    assert.equal(
      (await service.reembed(alice, { component: "READING" })).queued,
      0,
      "pending job preserved",
    );
    await worker.runBatch();
    assert.equal(calls, 1, "valid vector cache reused");
    assert.equal(
      (await service.status()).coverage.find((c) => c.component === "READING")!
        .percent,
      100,
    );
    assert.ok(
      (await db.query(`SELECT * FROM audit_logs WHERE action='RAG_REEMBED'`))
        .length >= 3,
    );
    for (let i = 0; i < 5; i++)
      await db.query(
        `INSERT INTO retrieval_gaps(user_id,feature,component,part_number,topic_codes,top_similarity,source_question_id,created_at) VALUES($1,'PLAN','READING',1,ARRAY['time','time'],0.5,$2,'2026-11-01T23:59:59Z')`,
        [i % 2 ? alice : bob, questions[i % 4]],
      );
    await db.query(
      `INSERT INTO retrieval_gaps(user_id,feature,component,created_at) VALUES($1,'EXPLAIN','READING','2026-11-02')`,
      [alice],
    );
    const r = await request(http)
      .get("/admin/rag/gaps?pageSize=1&from=2026-11-01&to=2026-11-02")
      .set("x-role", "ADMIN")
      .expect(200);
    assert.equal(r.body.pagination.totalItems, 2);
    assert.equal(r.body.data[0].occurrences, 5);
    assert.equal(r.body.data[0].learners, 2);
    assert.equal(r.body.data[0].samples.length, 3);
    assert.equal(r.body.data[0].average_similarity, 0.5);
    assert.ok(!JSON.stringify(r.body).includes(alice));
    const page2 = await request(http)
      .get("/admin/rag/gaps?pageSize=1&page=2")
      .set("x-role", "ADMIN")
      .expect(200);
    assert.equal(page2.body.data[0].topic, null);
    const filtered = await request(http)
      .get("/admin/rag/gaps?feature=PLAN&to=2026-11-01")
      .set("x-role", "ADMIN")
      .expect(200);
    assert.equal(filtered.body.data[0].occurrences, 5);
    await db.query(
      `INSERT INTO retrieval_gaps(feature,component,created_at) VALUES('REPORT','READING','2026-05-01')`,
    );
    const clock = { now: () => new Date("2026-11-14T00:00:00Z") };
    await PersonalizationWorker.prototype.pruneRetrievalGaps.call({
      db,
      clock,
    });
    assert.equal(
      (
        await db.query(
          `SELECT count(*)::int n FROM retrieval_gaps WHERE feature='REPORT'`,
        )
      )[0].n,
      0,
    );
    assert.equal(
      (await db.query("SELECT count(*)::int n FROM retrieval_gaps"))[0].n,
      6,
    );
    await db.query(
      `UPDATE questions SET content='{"text":"Changed draft","options":["on","in"]}' WHERE id=$1`,
      [questions[0]],
    );
    assert.equal(
      (await service.status()).coverage.find((c) => c.component === "READING")!
        .embedded,
      3,
      "stale draft is not covered",
    );
    console.log(
      "R6 PASS: ADMIN/401/403, validation, grouping, pagination, distinct samples/users, UTC cutoff, retention, skip running/pending jobs, audit, one-skill reindex 100%, stale hash coverage",
    );
  } finally {
    await app.close();
  }
}).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
