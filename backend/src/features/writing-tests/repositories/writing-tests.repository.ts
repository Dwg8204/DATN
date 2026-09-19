import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ListWritingTestsQueryDto } from '../dto/list-writing-tests-query.dto';
import {
  WritingActor, WritingAudit, WritingTestAggregate, WritingTestMode, WritingTestStatus, WritingTestSummary,
} from '../types/writing-test.type';

type TestRow = {
  id: string; created_by: string; title: string; scope: 'PART' | 'FULL_SKILL'; part_number: number | null;
  cover: { url?: string } | null; part_contents: { schemaVersion?: number; parts?: Record<string, { context?: string; instruction?: string }> };
  version: number; status: WritingTestStatus; published_snapshot_id: string | null; created_at: Date; updated_at: Date;
};
type SummaryRow = Pick<TestRow, 'id' | 'created_by' | 'title' | 'scope' | 'part_number' | 'cover' | 'version' | 'status' | 'created_at' | 'updated_at'>;
type QuestionRow = {
  id: string; part_number: number; position: number; content: { prompt?: string; kind?: string };
  sample_answer: { text?: string } | null;
};
type StoredQuestion = {
  partNumber: number; position: number; type: string; content: { prompt: string; kind?: string }; sampleAnswer: { text: string };
};

export type WritingRepositoryMutation =
  | { outcome: 'SUCCESS'; value: WritingTestAggregate }
  | { outcome: 'NOT_FOUND' | 'FORBIDDEN' | 'VERSION_CONFLICT' };

@Injectable()
export class WritingTestsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async list(query: ListWritingTestsQueryDto, actor?: WritingActor): Promise<{ tests: WritingTestSummary[]; total: number }> {
    const values: unknown[] = ['WRITING'];
    const where = ['t.component = $1'];
    if (actor?.role === 'TEACHER') {
      values.push(actor.id);
      where.push(`t.created_by = $${values.length}`);
    }
    if (query.search?.trim()) {
      values.push(`%${this.escapeLike(query.search.trim())}%`);
      where.push(`t.title ILIKE $${values.length} ESCAPE '\\'`);
    }
    if (query.mode) {
      const mode = query.mode;
      values.push(mode === 'full' ? 'FULL_SKILL' : 'PART');
      where.push(`t.scope = $${values.length}`);
      if (mode !== 'full') {
        values.push(Number(mode.slice(-1)));
        where.push(`t.part_number = $${values.length}`);
      }
    }
    if (query.status) {
      values.push(query.status);
      where.push(`t.status = $${values.length}`);
    } else where.push(`t.status <> 'ARCHIVED'`);

    const whereSql = where.join(' AND ');
    const offset = (query.page - 1) * query.pageSize;
    const limitIndex = values.length + 1;
    const offsetIndex = values.length + 2;
    const [rows, counts] = await Promise.all([
      this.dataSource.query<Array<SummaryRow & { attempts: string }>>(
        `WITH page AS MATERIALIZED (
           SELECT t.id,t.created_by,t.title,t.scope,t.part_number,t.cover,t.version,t.status,t.created_at,t.updated_at
           FROM tests t WHERE ${whereSql}
           ORDER BY t.updated_at DESC,t.id DESC LIMIT $${limitIndex} OFFSET $${offsetIndex}
         )
         SELECT p.*,counts.attempts FROM page p
         CROSS JOIN LATERAL (
           SELECT count(*)::text AS attempts FROM test_snapshots ts
           JOIN test_attempts ta ON ta.snapshot_id=ts.id WHERE ts.test_id=p.id
         ) counts
         ORDER BY p.updated_at DESC,p.id DESC`,
        [...values, query.pageSize, offset],
      ),
      this.dataSource.query<Array<{ total: string }>>(`SELECT count(*)::text AS total FROM tests t WHERE ${whereSql}`, values),
    ]);
    return { tests: rows.map(row => this.toSummary(row, Number(row.attempts), actor)), total: Number(counts[0]?.total ?? 0) };
  }

  async listPublished(query: ListWritingTestsQueryDto): Promise<{ tests: WritingTestSummary[]; total: number }> {
    const values: unknown[] = ['WRITING'];
    const where = [`t.component=$1`, `ts.snapshot->>'component'='WRITING'`, 't.published_snapshot_id IS NOT NULL', 't.archived_at IS NULL'];
    if (query.search?.trim()) {
      values.push(`%${this.escapeLike(query.search.trim())}%`);
      where.push(`(ts.snapshot #>> '{details,title}') ILIKE $${values.length} ESCAPE '\\'`);
    }
    if (query.mode) {
      values.push(query.mode);
      where.push(`ts.snapshot->>'mode'=$${values.length}`);
    }
    const whereSql = where.join(' AND ');
    const offset = (query.page - 1) * query.pageSize;
    const limitIndex = values.length + 1;
    const offsetIndex = values.length + 2;
    const [rows, counts] = await Promise.all([
      this.dataSource.query<Array<{
        id: string; title: string; picture_url: string | null; mode: WritingTestMode;
        version: number; attempts: string; created_at: Date; updated_at: Date;
      }>>(
        `WITH page AS MATERIALIZED (
           SELECT t.id,t.published_snapshot_id,t.created_at,t.updated_at,
                  ts.snapshot #>> '{details,title}' AS title,
                  ts.snapshot #>> '{details,pictureUrl}' AS picture_url,
                  ts.snapshot->>'mode' AS mode,
                  COALESCE((ts.snapshot->>'version')::integer, 1) AS version
           FROM tests t JOIN test_snapshots ts ON ts.id=t.published_snapshot_id
           WHERE ${whereSql}
           ORDER BY t.updated_at DESC,t.id DESC
           LIMIT $${limitIndex} OFFSET $${offsetIndex}
         )
         SELECT p.*,counts.attempts FROM page p
         CROSS JOIN LATERAL (
           SELECT count(*)::text AS attempts FROM test_attempts ta
           WHERE ta.snapshot_id=p.published_snapshot_id
         ) counts
         ORDER BY p.updated_at DESC,p.id DESC`,
        [...values, query.pageSize, offset],
      ),
      this.dataSource.query<Array<{ total: string }>>(
        `SELECT count(*)::text AS total FROM tests t JOIN test_snapshots ts ON ts.id=t.published_snapshot_id WHERE ${whereSql}`,
        values,
      ),
    ]);
    return {
      tests: rows.map(row => this.snapshotSummary(
        { mode: row.mode, details: { title: row.title, pictureUrl: row.picture_url ?? '' }, version: row.version },
        row.id, Number(row.attempts), row.created_at, row.updated_at,
      )),
      total: Number(counts[0]?.total ?? 0),
    };
  }

  async findAggregate(id: string): Promise<WritingTestAggregate | null> {
    const rows = await this.dataSource.query<TestRow[]>(`SELECT * FROM tests WHERE id=$1 AND component='WRITING' LIMIT 1`, [id]);
    if (!rows[0]) return null;
    return this.hydrate(rows[0], await this.loadQuestions(this.dataSource.manager, id));
  }

  async findPublishedAggregate(id: string): Promise<WritingTestAggregate | null> {
    const rows = await this.dataSource.query<Array<{ snapshot: WritingTestAggregate }>>(
      `SELECT ts.snapshot FROM tests t JOIN test_snapshots ts ON ts.id=t.published_snapshot_id
       WHERE t.id=$1 AND t.component='WRITING' AND t.archived_at IS NULL LIMIT 1`, [id],
    );
    return rows[0]?.snapshot ?? null;
  }

  async create(actor: WritingActor, test: WritingTestAggregate, audit: WritingAudit): Promise<WritingTestAggregate> {
    return this.dataSource.transaction(async manager => {
      const mapping = this.modeColumns(test.mode);
      const rows = await manager.query<TestRow[]>(
        `INSERT INTO tests(created_by,updated_by,title,component,scope,part_number,cover,part_contents,status)
         VALUES($1,$1,$2,'WRITING',$3,$4,$5::jsonb,$6::jsonb,'DRAFT') RETURNING *`,
        [actor.id, test.details.title || 'Untitled Writing Test', mapping.scope, mapping.partNumber,
          JSON.stringify(test.details.pictureUrl ? { url: test.details.pictureUrl } : null),
          JSON.stringify(this.partContents(test))],
      );
      await this.upsertQuestions(manager, rows[0].id, this.toQuestions(test));
      await this.writeAudit(manager, actor.id, 'WRITING_TEST_CREATED', rows[0].id, { mode: test.mode }, audit);
      return this.hydrate(rows[0], await this.loadQuestions(manager, rows[0].id));
    });
  }

  async update(id: string, actor: WritingActor, expectedVersion: number, test: WritingTestAggregate, audit: WritingAudit): Promise<WritingRepositoryMutation> {
    return this.dataSource.transaction(async manager => {
      const current = await this.lock(manager, id);
      if (!current || current.status === 'ARCHIVED') return { outcome: 'NOT_FOUND' };
      if (actor.role === 'TEACHER' && current.created_by !== actor.id) return { outcome: 'FORBIDDEN' };
      if (current.version !== expectedVersion) return { outcome: 'VERSION_CONFLICT' };
      const mapping = this.modeColumns(test.mode);
      const rows = await manager.query<TestRow[]>(
        `UPDATE tests SET title=$2,scope=$3,part_number=$4,cover=$5::jsonb,part_contents=$6::jsonb,
           status=CASE WHEN published_snapshot_id IS NULL THEN 'DRAFT'::publication_status ELSE status END,
           version=version+1,updated_by=$7,updated_at=now() WHERE id=$1 RETURNING *`,
        [id, test.details.title || 'Untitled Writing Test', mapping.scope, mapping.partNumber,
          JSON.stringify(test.details.pictureUrl ? { url: test.details.pictureUrl } : null),
          JSON.stringify(this.partContents(test)), actor.id],
      );
      const questionParts = this.partNumbers(test.mode);
      await manager.query(`UPDATE questions SET deleted_at=now(),updated_at=now() WHERE test_id=$1 AND NOT(part_number=ANY($2::smallint[])) AND deleted_at IS NULL`, [id, questionParts]);
      await this.upsertQuestions(manager, id, this.toQuestions(test));
      await this.writeAudit(manager, actor.id, 'WRITING_TEST_UPDATED', id, { fromVersion: expectedVersion, toVersion: expectedVersion + 1 }, audit);
      return { outcome: 'SUCCESS', value: this.hydrate(rows[0], await this.loadQuestions(manager, id)) };
    });
  }

  async publish(id: string, actor: WritingActor, expectedVersion: number, test: WritingTestAggregate, audit: WritingAudit): Promise<WritingRepositoryMutation> {
    return this.dataSource.transaction(async manager => {
      const current = await this.lock(manager, id);
      if (!current || current.status === 'ARCHIVED') return { outcome: 'NOT_FOUND' };
      if (actor.role === 'TEACHER' && current.created_by !== actor.id) return { outcome: 'FORBIDDEN' };
      if (current.version !== expectedVersion) return { outcome: 'VERSION_CONFLICT' };
      const snapshot = { id, component: 'WRITING', mode: test.mode, details: test.details, parts: test.parts, status: 'PUBLISHED' as const, version: current.version };
      const serialized = JSON.stringify(snapshot);
      const hash = createHash('sha256').update(serialized).digest('hex');
      const snapshotRows = await manager.query<Array<{ id: string }>>(
        `WITH inserted AS (
           INSERT INTO test_snapshots(test_id,version,schema_version,snapshot,content_hash)
           VALUES($1,$2,1,$3::jsonb,$4) ON CONFLICT(test_id,version) DO NOTHING RETURNING id
         )
         SELECT id FROM inserted UNION ALL
         SELECT id FROM test_snapshots WHERE test_id=$1 AND version=$2 AND content_hash=$4 LIMIT 1`,
        [id, current.version, serialized, hash],
      );
      if (!snapshotRows[0]) return { outcome: 'VERSION_CONFLICT' };
      const rows = await manager.query<TestRow[]>(
        `UPDATE tests SET status='PUBLISHED',published_snapshot_id=$2,published_at=now(),archived_at=NULL,updated_by=$3,updated_at=now()
         WHERE id=$1 RETURNING *`, [id, snapshotRows[0].id, actor.id],
      );
      await this.writeAudit(manager, actor.id, 'WRITING_TEST_PUBLISHED', id, { version: current.version }, audit);
      return { outcome: 'SUCCESS', value: this.hydrate(rows[0], await this.loadQuestions(manager, id)) };
    });
  }

  async archive(id: string, actor: WritingActor, audit: WritingAudit): Promise<WritingRepositoryMutation> {
    return this.dataSource.transaction(async manager => {
      const current = await this.lock(manager, id);
      if (!current || current.status === 'ARCHIVED') return { outcome: 'NOT_FOUND' };
      if (actor.role === 'TEACHER' && current.created_by !== actor.id) return { outcome: 'FORBIDDEN' };
      const rows = await manager.query<TestRow[]>(
        `UPDATE tests SET status='ARCHIVED',archived_at=now(),updated_by=$2,updated_at=now() WHERE id=$1 RETURNING *`, [id, actor.id],
      );
      await this.writeAudit(manager, actor.id, 'WRITING_TEST_ARCHIVED', id, { version: current.version }, audit);
      return { outcome: 'SUCCESS', value: this.hydrate(rows[0], await this.loadQuestions(manager, id)) };
    });
  }

  async findOwner(id: string): Promise<{ createdBy: string; status: WritingTestStatus } | null> {
    const rows = await this.dataSource.query<Array<{ created_by: string; status: WritingTestStatus }>>(
      `SELECT created_by,status FROM tests WHERE id=$1 AND component='WRITING' LIMIT 1`, [id],
    );
    return rows[0] ? { createdBy: rows[0].created_by, status: rows[0].status } : null;
  }

  private async loadQuestions(manager: EntityManager, id: string): Promise<QuestionRow[]> {
    return manager.query<QuestionRow[]>(
      `SELECT id,part_number,position,content,sample_answer FROM questions WHERE test_id=$1 AND deleted_at IS NULL ORDER BY part_number,position`, [id],
    );
  }

  private async upsertQuestions(manager: EntityManager, id: string, questions: StoredQuestion[]): Promise<void> {
    if (!questions.length) return;
    const values: unknown[] = [];
    const tuples = questions.map(question => {
      const start = values.length;
      values.push(id, question.partNumber, question.position, question.type, JSON.stringify(question.content), JSON.stringify(question.sampleAnswer));
      return `($${start + 1},$${start + 2},NULL,$${start + 3},$${start + 4},$${start + 5}::jsonb,$${start + 6}::jsonb)`;
    });
    await manager.query(
      `INSERT INTO questions(test_id,part_number,group_key,position,question_type,content,sample_answer)
       VALUES ${tuples.join(',')}
       ON CONFLICT(test_id,part_number,position) WHERE deleted_at IS NULL DO UPDATE SET
         question_type=EXCLUDED.question_type,content=EXCLUDED.content,sample_answer=EXCLUDED.sample_answer,updated_at=now()`,
      values,
    );
  }

  private partContents(test: WritingTestAggregate) {
    const parts: Record<string, { context?: string; instruction?: string }> = {};
    if (test.parts[1]) parts['1'] = { context: test.parts[1].context };
    if (test.parts[2]) parts['2'] = { instruction: test.parts[2].instruction };
    if (test.parts[3]) parts['3'] = { context: test.parts[3].context };
    if (test.parts[4]) parts['4'] = { context: test.parts[4].context };
    return { schemaVersion: 1, parts };
  }

  private toQuestions(test: WritingTestAggregate): StoredQuestion[] {
    const questions: StoredQuestion[] = [];
    const p1 = test.parts[1];
    if (p1) p1.questions.forEach((prompt, index) => questions.push({ partNumber: 1, position: index + 1, type: 'WRITING_SHORT_RESPONSE', content: { prompt }, sampleAnswer: { text: p1.sampleAnswers[index] } }));
    const p2 = test.parts[2];
    if (p2) questions.push({ partNumber: 2, position: 1, type: 'WRITING_SHORT_TEXT', content: { prompt: p2.prompt }, sampleAnswer: { text: p2.sampleAnswer } });
    const p3 = test.parts[3];
    if (p3) p3.messages.forEach((prompt, index) => questions.push({ partNumber: 3, position: index + 1, type: 'WRITING_CHAT_RESPONSE', content: { prompt }, sampleAnswer: { text: p3.sampleAnswers[index] } }));
    const p4 = test.parts[4];
    if (p4) {
      questions.push({ partNumber: 4, position: 1, type: 'WRITING_EMAIL', content: { prompt: p4.informalPrompt, kind: 'informal' }, sampleAnswer: { text: p4.informalSample } });
      questions.push({ partNumber: 4, position: 2, type: 'WRITING_EMAIL', content: { prompt: p4.formalPrompt, kind: 'formal' }, sampleAnswer: { text: p4.formalSample } });
    }
    return questions;
  }

  private hydrate(row: TestRow, questions: QuestionRow[]): WritingTestAggregate {
    const mode = this.rowMode(row);
    const metadata = row.part_contents?.parts ?? {};
    const forPart = (number: number) => questions.filter(question => question.part_number === number).sort((a, b) => a.position - b.position);
    const aggregate: WritingTestAggregate = {
      id: row.id, mode, details: { title: row.title, pictureUrl: row.cover?.url ?? '' }, parts: {},
      status: row.status, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
    };
    if (mode === 'part1' || mode === 'full') {
      const rows = forPart(1);
      aggregate.parts[1] = { context: metadata['1']?.context ?? '', questions: rows.map(question => question.content.prompt ?? ''), sampleAnswers: rows.map(question => question.sample_answer?.text ?? '') };
    }
    if (mode === 'part2' || mode === 'full') {
      const rowPart = forPart(2)[0];
      aggregate.parts[2] = { instruction: metadata['2']?.instruction ?? '', prompt: rowPart?.content.prompt ?? '', sampleAnswer: rowPart?.sample_answer?.text ?? '' };
    }
    if (mode === 'part3' || mode === 'full') {
      const rows = forPart(3);
      aggregate.parts[3] = { context: metadata['3']?.context ?? '', messages: rows.map(question => question.content.prompt ?? ''), sampleAnswers: rows.map(question => question.sample_answer?.text ?? '') };
    }
    if (mode === 'part4' || mode === 'full') {
      const rows = forPart(4);
      aggregate.parts[4] = {
        context: metadata['4']?.context ?? '', informalPrompt: rows[0]?.content.prompt ?? '', informalSample: rows[0]?.sample_answer?.text ?? '',
        formalPrompt: rows[1]?.content.prompt ?? '', formalSample: rows[1]?.sample_answer?.text ?? '',
      };
    }
    return aggregate;
  }

  private toSummary(row: SummaryRow, attempts: number, actor?: WritingActor): WritingTestSummary {
    const mode = this.rowMode(row);
    const canManage = Boolean(actor && (actor.role === 'ADMIN' || row.created_by === actor.id));
    return {
      id: row.id, title: row.title, name: row.title, mode, section: this.section(mode), component: 'Writing', status: row.status,
      attempts, questionType: 'Writing responses', pictureUrl: row.cover?.url ?? '', version: row.version,
      createdAt: row.created_at, updatedAt: row.updated_at, dateAdded: row.created_at,
      canEdit: canManage && row.status !== 'ARCHIVED', canDelete: canManage && row.status !== 'ARCHIVED',
    };
  }

  private snapshotSummary(test: Pick<WritingTestAggregate, 'mode' | 'details' | 'version'>, id: string, attempts: number, createdAt: Date, updatedAt: Date): WritingTestSummary {
    const mode = test.mode;
    return {
      id, title: test.details.title, name: test.details.title, mode, section: this.section(mode), component: 'Writing', status: 'PUBLISHED',
      attempts, questionType: 'Writing responses', pictureUrl: test.details.pictureUrl ?? '', version: test.version ?? 1,
      createdAt, updatedAt, dateAdded: createdAt, canEdit: false, canDelete: false,
    };
  }

  private async lock(manager: EntityManager, id: string): Promise<TestRow | null> {
    const rows = await manager.query<TestRow[]>(`SELECT * FROM tests WHERE id=$1 AND component='WRITING' FOR UPDATE`, [id]);
    return rows[0] ?? null;
  }

  private async writeAudit(manager: EntityManager, actorId: string, action: string, entityId: string, changes: unknown, audit: WritingAudit): Promise<void> {
    await manager.query(
      `INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,changes,request_id,ip_address)
       VALUES($1,$2,'WRITING_TEST',$3,$4::jsonb,$5,$6)`,
      [actorId, action, entityId, JSON.stringify(changes), audit.requestId ?? null, audit.ipAddress ?? null],
    );
  }

  private modeColumns(mode: WritingTestMode): { scope: 'PART' | 'FULL_SKILL'; partNumber: number | null } {
    return mode === 'full' ? { scope: 'FULL_SKILL', partNumber: null } : { scope: 'PART', partNumber: Number(mode.slice(-1)) };
  }

  private rowMode(row: Pick<TestRow, 'scope' | 'part_number'>): WritingTestMode {
    return row.scope === 'FULL_SKILL' ? 'full' : `part${row.part_number}` as WritingTestMode;
  }

  private partNumbers(mode: WritingTestMode): Array<1 | 2 | 3 | 4> { return mode === 'full' ? [1, 2, 3, 4] : [Number(mode.slice(-1)) as 1 | 2 | 3 | 4]; }
  private section(mode: WritingTestMode): string { return mode === 'full' ? 'Full Test' : `Part ${mode.slice(-1)}`; }
  private escapeLike(value: string): string { return value.replace(/[%_\\]/g, char => `\\${char}`); }
}
