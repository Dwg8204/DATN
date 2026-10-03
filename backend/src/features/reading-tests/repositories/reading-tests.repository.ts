import { findCreatedTest, testCreationId } from '../../../common/tests/test-creation';
import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ListReadingTestsQueryDto } from '../dto/list-reading-tests-query.dto';
import { ReadingActor, ReadingAudit, ReadingTestAggregate, ReadingTestMode } from '../types/reading-test.type';

type Mutation = { outcome: 'SUCCESS'; value: ReadingTestAggregate } |
  { outcome: 'NOT_FOUND' | 'FORBIDDEN' | 'VERSION_CONFLICT' };

@Injectable()
export class ReadingTestsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async list(query: ListReadingTestsQueryDto, actor?: ReadingActor) {
    const values: unknown[] = ['READING'];
    const where = ['t.component=$1'];
    if (query.purpose) { values.push(query.purpose); where.push(`t.purpose=$${values.length}`); }
    if (actor?.role === 'TEACHER') { values.push(actor.id); where.push(`t.created_by=$${values.length}`); }
    if (query.search?.trim()) {
      values.push(`%${query.search.trim().replace(/[%_\\]/g, value => `\\${value}`)}%`);
      where.push(`t.title ILIKE $${values.length} ESCAPE '\\'`);
    }
    if (query.mode) {
      values.push(query.mode === 'full' ? 'FULL_SKILL' : 'PART');
      where.push(`t.scope=$${values.length}`);
      if (query.mode !== 'full') { values.push(Number(query.mode.slice(4))); where.push(`t.part_number=$${values.length}`); }
    }
    if (query.status) { values.push(query.status); where.push(`t.status=$${values.length}`); }
    else where.push("t.status<>'ARCHIVED'");
    const [{ total }] = await this.dataSource.query<Array<{ total: string }>>(
      `SELECT count(*)::text AS total FROM tests t WHERE ${where.join(' AND ')}`, values);
    const rows = await this.dataSource.query<any[]>(
      `SELECT t.id,t.title,t.purpose,t.scope,t.part_number,t.status,t.cover,t.version,t.created_at,t.updated_at,t.created_by,
        (SELECT count(*) FROM test_attempts a WHERE a.snapshot_id=t.published_snapshot_id) AS attempts_count
       FROM tests t WHERE ${where.join(' AND ')} ORDER BY t.created_at DESC,t.id DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, query.pageSize, (query.page - 1) * query.pageSize]);
    return { tests: rows.map(row => {
      const mode = row.scope === 'FULL_SKILL' ? 'full' : `part${row.part_number}`;
      return { id: row.id, title: row.title, name: row.title, purpose: row.purpose, mode,
        section: mode === 'full' ? 'Full Test' : `Part ${row.part_number}`, component: 'Reading', status: row.status,
        attempts: Number(row.attempts_count), questionType: 'Reading', pictureUrl: row.cover?.pictureUrl ?? '', version: row.version,
        dateAdded: row.created_at, createdAt: row.created_at, updatedAt: row.updated_at,
        canEdit: actor?.role === 'ADMIN' || actor?.id === row.created_by,
        canDelete: actor?.role === 'ADMIN' || actor?.id === row.created_by };
    }), total: Number(total) };
  }

  listPublished(query: ListReadingTestsQueryDto) {
    return this.list({ ...query, purpose: query.purpose ?? 'EXAM', status: 'PUBLISHED' });
  }

  async findAggregate(id: string): Promise<ReadingTestAggregate | null> {
    const [row] = await this.dataSource.query<any[]>("SELECT * FROM tests WHERE id=$1 AND component='READING'", [id]);
    if (!row) return null;
    return this.aggregate(row);
  }

  async findPublishedAggregate(id: string): Promise<ReadingTestAggregate | null> {
    const [row] = await this.dataSource.query<any[]>(
      `SELECT s.snapshot FROM tests t JOIN test_snapshots s ON s.id=t.published_snapshot_id
       WHERE t.id=$1 AND t.component='READING' AND t.status='PUBLISHED'`, [id]);
    return row?.snapshot ?? null;
  }

  async findOwner(id: string) {
    const [row] = await this.dataSource.query<any[]>("SELECT created_by,status FROM tests WHERE id=$1 AND component='READING'", [id]);
    return row ? { createdBy: row.created_by, status: row.status } : null;
  }

  async create(actor: ReadingActor, aggregate: ReadingTestAggregate, audit: ReadingAudit, creationRequestId?: string) {
    const id = testCreationId(actor.id, 'READING', creationRequestId);
    let replayed = false;
    const { scope, partNumber } = this.scope(aggregate.mode);
    await this.dataSource.transaction(async manager => {
      if (await findCreatedTest(manager, id, creationRequestId)) { replayed = true; return; }
      await manager.query(
        `INSERT INTO tests(id,created_by,title,component,purpose,scope,part_number,cover,part_contents,version,status,updated_by)
         VALUES($1,$2,$3,'READING',$4,$5,$6,$7,$8,1,'DRAFT',$2)`,
        [id, actor.id, aggregate.details.title, aggregate.purpose, scope, partNumber,
          { pictureUrl: aggregate.details.pictureUrl }, { schemaVersion: 1, parts: aggregate.parts }]);
      await this.syncQuestions(manager, id, aggregate);
      await this.audit(manager, actor.id, 'CREATE_READING_TEST', id, aggregate, audit);
    });
    const saved = (await this.findAggregate(id))!;
    return replayed ? { ...saved, creationReplayed: true } : saved;
  }

  async update(id: string, actor: ReadingActor, version: number, aggregate: ReadingTestAggregate, audit: ReadingAudit): Promise<Mutation> {
    let outcome: Mutation['outcome'] = 'SUCCESS';
    const { scope, partNumber } = this.scope(aggregate.mode);
    await this.dataSource.transaction(async manager => {
      const [locked] = await manager.query<any[]>("SELECT version,created_by FROM tests WHERE id=$1 AND component='READING' FOR UPDATE", [id]);
      if (!locked) { outcome = 'NOT_FOUND'; return; }
      if (actor.role === 'TEACHER' && locked.created_by !== actor.id) { outcome = 'FORBIDDEN'; return; }
      if (locked.version !== version) { outcome = 'VERSION_CONFLICT'; return; }
      await manager.query(
        `UPDATE tests SET title=$2,purpose=$3,scope=$4,part_number=$5,cover=$6,part_contents=$7,
         version=version+1,status='DRAFT',updated_by=$8,updated_at=now() WHERE id=$1`,
        [id, aggregate.details.title, aggregate.purpose, scope, partNumber, { pictureUrl: aggregate.details.pictureUrl },
          { schemaVersion: 1, parts: aggregate.parts }, actor.id]);
      await this.syncQuestions(manager, id, aggregate);
      await this.audit(manager, actor.id, 'UPDATE_READING_TEST', id, aggregate, audit);
    });
    return outcome === 'SUCCESS' ? { outcome, value: (await this.findAggregate(id))! } : { outcome };
  }

  async publish(id: string, actor: ReadingActor, version: number, aggregate: ReadingTestAggregate, audit: ReadingAudit): Promise<Mutation> {
    let outcome: Mutation['outcome'] = 'SUCCESS';
    await this.dataSource.transaction(async manager => {
      const [locked] = await manager.query<any[]>("SELECT version,created_by FROM tests WHERE id=$1 AND component='READING' FOR UPDATE", [id]);
      if (!locked) { outcome = 'NOT_FOUND'; return; }
      if (actor.role === 'TEACHER' && locked.created_by !== actor.id) { outcome = 'FORBIDDEN'; return; }
      if (locked.version !== version) { outcome = 'VERSION_CONFLICT'; return; }
      const newVersion = version + 1;
      const snapshotId = randomUUID();
      const serialized = JSON.stringify(aggregate);
      await manager.query(`INSERT INTO test_snapshots(id,test_id,version,schema_version,snapshot,content_hash)
        VALUES($1,$2,$3,1,$4,$5)`, [snapshotId, id, newVersion, aggregate, createHash('sha256').update(serialized).digest('hex')]);
      await manager.query(`UPDATE tests SET version=$2,status='PUBLISHED',published_snapshot_id=$3,published_at=now(),
        updated_by=$4,updated_at=now() WHERE id=$1`, [id, newVersion, snapshotId, actor.id]);
      await this.audit(manager, actor.id, 'PUBLISH_READING_TEST', id, { snapshotId, version: newVersion }, audit);
    });
    return outcome === 'SUCCESS' ? { outcome, value: (await this.findAggregate(id))! } : { outcome };
  }

  async archive(id: string, actor: ReadingActor, audit: ReadingAudit): Promise<Mutation> {
    let outcome: Mutation['outcome'] = 'SUCCESS';
    await this.dataSource.transaction(async manager => {
      const [locked] = await manager.query<any[]>("SELECT created_by FROM tests WHERE id=$1 AND component='READING' FOR UPDATE", [id]);
      if (!locked) { outcome = 'NOT_FOUND'; return; }
      if (actor.role === 'TEACHER' && locked.created_by !== actor.id) { outcome = 'FORBIDDEN'; return; }
      await manager.query("UPDATE tests SET status='ARCHIVED',archived_at=now(),updated_by=$2,updated_at=now() WHERE id=$1", [id, actor.id]);
      await this.audit(manager, actor.id, 'ARCHIVE_READING_TEST', id, {}, audit);
    });
    return outcome === 'SUCCESS' ? { outcome, value: null as any } : { outcome };
  }

  private aggregate(row: any): ReadingTestAggregate {
    return { id: row.id, mode: (row.scope === 'FULL_SKILL' ? 'full' : `part${row.part_number}`) as ReadingTestMode,
      purpose: row.purpose, details: { title: row.title, pictureUrl: row.cover?.pictureUrl },
      parts: row.part_contents?.parts ?? {}, status: row.status, version: row.version,
      createdAt: row.created_at, updatedAt: row.updated_at };
  }

  private scope(mode: ReadingTestMode) {
    return { scope: mode === 'full' ? 'FULL_SKILL' : 'PART', partNumber: mode === 'full' ? null : Number(mode.slice(4)) };
  }

  private async syncQuestions(manager: EntityManager, testId: string, test: ReadingTestAggregate) {
    await manager.query('UPDATE questions SET deleted_at=now() WHERE test_id=$1 AND deleted_at IS NULL', [testId]);
    const insert = (part: number, position: number, type: string, content: unknown, answer: unknown, explanation?: string) =>
      manager.query(`INSERT INTO questions(test_id,part_number,position,question_type,content,correct_answer,explanation)
        VALUES($1,$2,$3,$4,$5,$6,$7)`, [testId, part, position, type, content, answer, explanation ? { text: explanation } : null]);
    const p1 = test.parts['1'];
    if (p1) for (const [index, question] of p1.questions.entries()) await insert(1, index + 1, 'READING_GAP_CHOICE',
      { options: question.options }, { answer: question.answer }, question.explanation);
    const p2 = test.parts['2'];
    if (p2) {
      const texts = Array.isArray(p2.texts) ? p2.texts : [{ id: 'p2-text1', title: p2.title, sentences: p2.sentences }];
      let questionPosition = 0;
      for (const [textIndex, text] of texts.entries()) {
        for (const sentence of text.sentences.slice(1)) {
          questionPosition += 1;
          await insert(2, questionPosition, 'READING_ORDER',
            { textId: text.id || `p2-text${textIndex + 1}`, textTitle: text.title, sentenceId: sentence.id, text: sentence.content },
            { position: sentence.correctPosition }, sentence.explanation);
        }
      }
    }
    const p3 = test.parts['3'];
    if (p3) for (const [index, question] of p3.questions.entries()) await insert(3, index + 1, 'READING_OPINION_MATCH',
      { statement: question.statement }, { speaker: question.answer }, question.explanation);
    const p4 = test.parts['4'];
    if (p4) for (const [index, paragraph] of p4.paragraphs.entries()) {
      const heading = p4.headings.find((item: any) => item.correctParagraph === paragraph.id);
      await insert(4, index + 1, 'READING_HEADING_MATCH', { paragraphId: paragraph.id, text: paragraph.content },
        { headingId: heading?.id }, heading?.explanation);
    }
  }

  private audit(manager: EntityManager, actorId: string, action: string, entityId: string, changes: unknown, audit: ReadingAudit) {
    return manager.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,changes,request_id,ip_address)
      VALUES($1,$2,'READING_TEST',$3,$4,$5,$6)`, [actorId, action, entityId, changes, audit.requestId, audit.ipAddress]);
  }
}
