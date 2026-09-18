import { randomUUID, createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ListListeningTestsQueryDto } from '../dto/list-listening-tests-query.dto';
import {
  ListeningActor,
  ListeningAudit,
  ListeningTestAggregate,
  ListeningTestMode,
  ListeningTestStatus,
  ListeningTestSummary,
} from '../types/listening-test.type';

type TestRow = {
  id: string;
  created_by: string;
  title: string;
  scope: 'PART' | 'FULL_SKILL';
  part_number: number | null;
  cover: { pictureUrl?: string } | null;
  part_contents: {
    schemaVersion?: number;
    part1?: Record<string, unknown>;
    part2?: Record<string, unknown>;
    part3?: Record<string, unknown>;
    part4?: Record<string, unknown>;
  };
  version: number;
  status: ListeningTestStatus;
  published_snapshot_id: string | null;
  created_at: Date;
  updated_at: Date;
};

type QuestionRow = {
  id: string;
  part_number: number;
  group_key: string | null;
  position: number;
  question_type: string;
  content: Record<string, unknown>;
  correct_answer: Record<string, unknown> | null;
  explanation: Record<string, unknown> | null;
};

export type RepositoryMutation =
  | { outcome: 'SUCCESS'; value: ListeningTestAggregate }
  | { outcome: 'NOT_FOUND' | 'FORBIDDEN' | 'VERSION_CONFLICT' };

@Injectable()
export class ListeningTestsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async list(query: ListListeningTestsQueryDto, actor?: ListeningActor): Promise<{ tests: ListeningTestSummary[]; total: number }> {
    const values: unknown[] = ['LISTENING'];
    const where = ['t.component = $1'];
    if (actor?.role === 'TEACHER') {
      values.push(actor.id);
      where.push(`t.created_by = $${values.length}`);
    }
    if (query.search?.trim()) {
      values.push(`%${query.search.trim().replace(/[%_\\]/g, value => `\\${value}`)}%`);
      where.push(`t.title ILIKE $${values.length} ESCAPE '\\'`);
    }
    if (query.mode) {
      const scope = query.mode === 'full' ? 'FULL_SKILL' : 'PART';
      values.push(scope);
      where.push(`t.scope = $${values.length}`);
      if (scope === 'PART') {
        values.push(parseInt(query.mode.replace('part', ''), 10));
        where.push(`t.part_number = $${values.length}`);
      }
    }
    if (query.status) {
      values.push(query.status);
      where.push(`t.status = $${values.length}`);
    } else {
      where.push(`t.status <> 'ARCHIVED'`);
    }

    const countResult = await this.dataSource.query(
      `SELECT count(*) FROM tests t WHERE ${where.join(' AND ')}`,
      values,
    );
    const total = parseInt(countResult[0].count, 10);
    if (total === 0) return { tests: [], total: 0 };

    const offset = (query.page - 1) * query.pageSize;
    const limit = query.pageSize;
    const rows = await this.dataSource.query(
      `
      SELECT
        t.id, t.title, t.scope, t.part_number, t.status, t.cover, t.version,
        t.created_at, t.updated_at, t.created_by,
        u.first_name, u.last_name,
        (SELECT count(*) FROM test_attempts a WHERE a.component = 'LISTENING' AND (a.snapshot_id = t.published_snapshot_id OR (a.scope = t.scope AND a.part_number = t.part_number))) as attempts_count
      FROM tests t
      JOIN users u ON u.id = t.created_by
      WHERE ${where.join(' AND ')}
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
      `,
      values,
    );

    return {
      tests: rows.map((row: any): ListeningTestSummary => {
        const mode = row.scope === 'FULL_SKILL' ? 'full' : `part${row.part_number}`;
        return {
          id: row.id,
          title: row.title,
          name: row.title,
          mode: mode as ListeningTestMode,
          section: mode === 'full' ? 'Full Test' : `Part ${row.part_number}`,
          component: 'Listening',
          status: row.status,
          attempts: parseInt(row.attempts_count, 10),
          questionType: 'Listening',
          pictureUrl: row.cover?.pictureUrl ?? '',
          version: row.version,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          dateAdded: row.created_at,
          canEdit: actor?.role === 'ADMIN' || actor?.id === row.created_by,
          canDelete: actor?.role === 'ADMIN' || actor?.id === row.created_by,
        };
      }),
      total,
    };
  }

  async listPublished(query: ListListeningTestsQueryDto): Promise<{ tests: ListeningTestSummary[]; total: number }> {
    return this.list({ ...query, status: 'PUBLISHED' });
  }

  async findAggregate(id: string): Promise<ListeningTestAggregate | null> {
    const rows = await this.dataSource.query(`SELECT * FROM tests WHERE id = $1 AND component = 'LISTENING'`, [id]);
    if (rows.length === 0) return null;
    const test: TestRow = rows[0];

    const questions = await this.dataSource.query(
      `SELECT * FROM questions WHERE test_id = $1 AND deleted_at IS NULL ORDER BY part_number, position`,
      [id],
    );

    return this.assembleAggregate(test, questions);
  }

  async findPublishedAggregate(id: string): Promise<ListeningTestAggregate | null> {
    const tests = await this.dataSource.query(`SELECT * FROM tests WHERE id = $1 AND component = 'LISTENING' AND status = 'PUBLISHED'`, [id]);
    if (tests.length === 0) return null;
    const test: TestRow = tests[0];
    if (!test.published_snapshot_id) return null;
    
    const snapshots = await this.dataSource.query(`SELECT snapshot FROM test_snapshots WHERE id = $1`, [test.published_snapshot_id]);
    if (snapshots.length === 0) return null;
    
    return snapshots[0].snapshot as ListeningTestAggregate;
  }

  async findOwner(id: string): Promise<{ createdBy: string; status: ListeningTestStatus } | null> {
    const rows = await this.dataSource.query(`SELECT created_by, status FROM tests WHERE id = $1 AND component = 'LISTENING'`, [id]);
    if (rows.length === 0) return null;
    return { createdBy: rows[0].created_by, status: rows[0].status };
  }

  async create(actor: ListeningActor, aggregate: ListeningTestAggregate, audit: ListeningAudit): Promise<ListeningTestAggregate> {
    const id = randomUUID();
    const mode = aggregate.mode;
    const scope = mode === 'full' ? 'FULL_SKILL' : 'PART';
    const partNumber = mode === 'full' ? null : parseInt(mode.replace('part', ''), 10);
    const cover = { pictureUrl: aggregate.details.pictureUrl };
    const contents = this.buildPartContents(aggregate);

    await this.dataSource.transaction(async manager => {
      await manager.query(
        `INSERT INTO tests (id, created_by, title, component, scope, part_number, cover, part_contents, version, status, updated_by)
         VALUES ($1, $2, $3, 'LISTENING', $4, $5, $6, $7, 1, 'DRAFT', $2)`,
        [id, actor.id, aggregate.details.title, scope, partNumber, cover, contents],
      );
      await this.syncQuestions(manager, id, aggregate);
      await this.audit(manager, actor.id, 'CREATE_LISTENING_TEST', id, aggregate, audit);
    });
    return (await this.findAggregate(id))!;
  }

  async update(id: string, actor: ListeningActor, version: number, aggregate: ListeningTestAggregate, audit: ListeningAudit): Promise<RepositoryMutation> {
    const mode = aggregate.mode;
    const scope = mode === 'full' ? 'FULL_SKILL' : 'PART';
    const partNumber = mode === 'full' ? null : parseInt(mode.replace('part', ''), 10);
    const cover = { pictureUrl: aggregate.details.pictureUrl };
    const contents = this.buildPartContents(aggregate);

    let outcome: RepositoryMutation['outcome'] = 'SUCCESS';
    await this.dataSource.transaction(async manager => {
      const lock = await manager.query(`SELECT version, created_by FROM tests WHERE id = $1 AND component = 'LISTENING' FOR UPDATE`, [id]);
      if (lock.length === 0) { outcome = 'NOT_FOUND'; return; }
      if (actor.role === 'TEACHER' && lock[0].created_by !== actor.id) { outcome = 'FORBIDDEN'; return; }
      if (lock[0].version !== version) { outcome = 'VERSION_CONFLICT'; return; }

      await manager.query(
        `UPDATE tests
         SET title = $1, scope = $2, part_number = $3, cover = $4, part_contents = $5, version = version + 1, updated_by = $6, status = 'DRAFT', updated_at = now()
         WHERE id = $7`,
        [aggregate.details.title, scope, partNumber, cover, contents, actor.id, id],
      );
      await this.syncQuestions(manager, id, aggregate);
      await this.audit(manager, actor.id, 'UPDATE_LISTENING_TEST', id, aggregate, audit);
    });
    if (outcome !== 'SUCCESS') return { outcome };
    return { outcome: 'SUCCESS', value: (await this.findAggregate(id))! };
  }

  async publish(id: string, actor: ListeningActor, version: number, aggregate: ListeningTestAggregate, audit: ListeningAudit): Promise<RepositoryMutation> {
    const cover = { pictureUrl: aggregate.details.pictureUrl };
    const contents = this.buildPartContents(aggregate);
    const snapshotStr = JSON.stringify(aggregate);
    const hash = createHash('sha256').update(snapshotStr).digest('hex');

    let outcome: RepositoryMutation['outcome'] = 'SUCCESS';
    await this.dataSource.transaction(async manager => {
      const lock = await manager.query(`SELECT version, created_by FROM tests WHERE id = $1 AND component = 'LISTENING' FOR UPDATE`, [id]);
      if (lock.length === 0) { outcome = 'NOT_FOUND'; return; }
      if (actor.role === 'TEACHER' && lock[0].created_by !== actor.id) { outcome = 'FORBIDDEN'; return; }
      if (lock[0].version !== version) { outcome = 'VERSION_CONFLICT'; return; }

      const snapshotId = randomUUID();
      const newVersion = version + 1;
      
      await manager.query(
        `UPDATE tests
         SET title = $1, cover = $2, part_contents = $3, version = $4, updated_by = $5, updated_at = now()
         WHERE id = $6`,
        [aggregate.details.title, cover, contents, newVersion, actor.id, id],
      );
      await this.syncQuestions(manager, id, aggregate);
      
      await manager.query(
        `INSERT INTO test_snapshots (id, test_id, version, schema_version, snapshot, content_hash)
         VALUES ($1, $2, $3, 1, $4, $5)`,
        [snapshotId, id, newVersion, aggregate, hash],
      );
      
      await manager.query(
        `UPDATE tests
         SET status = 'PUBLISHED', published_snapshot_id = $1, published_at = now()
         WHERE id = $2`,
        [snapshotId, id],
      );
      await this.audit(manager, actor.id, 'PUBLISH_LISTENING_TEST', id, { version: newVersion, snapshotId }, audit);
    });
    if (outcome !== 'SUCCESS') return { outcome };
    return { outcome: 'SUCCESS', value: (await this.findAggregate(id))! };
  }

  async archive(id: string, actor: ListeningActor, audit: ListeningAudit): Promise<RepositoryMutation> {
    let outcome: RepositoryMutation['outcome'] = 'SUCCESS';
    await this.dataSource.transaction(async manager => {
      const lock = await manager.query(`SELECT status, created_by FROM tests WHERE id = $1 AND component = 'LISTENING' FOR UPDATE`, [id]);
      if (lock.length === 0) { outcome = 'NOT_FOUND'; return; }
      if (actor.role === 'TEACHER' && lock[0].created_by !== actor.id) { outcome = 'FORBIDDEN'; return; }
      if (lock[0].status === 'ARCHIVED') return; // Idempotent

      await manager.query(
        `UPDATE tests SET status = 'ARCHIVED', archived_at = now(), updated_by = $1, updated_at = now() WHERE id = $2`,
        [actor.id, id],
      );
      await this.audit(manager, actor.id, 'ARCHIVE_LISTENING_TEST', id, {}, audit);
    });
    if (outcome !== 'SUCCESS') return { outcome };
    return { outcome: 'SUCCESS', value: null as any };
  }

  private assembleAggregate(test: TestRow, questions: QuestionRow[]): ListeningTestAggregate {
    const mode = test.scope === 'FULL_SKILL' ? 'full' : `part${test.part_number}`;
    const aggregate: ListeningTestAggregate = {
      id: test.id,
      mode: mode as ListeningTestMode,
      details: { title: test.title, pictureUrl: test.cover?.pictureUrl },
      parts: {},
      status: test.status,
      version: test.version,
      createdAt: test.created_at,
      updatedAt: test.updated_at,
    };

    const c = test.part_contents || {};
    
    if (mode === 'full' || mode === 'part1') {
      const q1 = questions.filter(q => q.part_number === 1).sort((a, b) => a.position - b.position);
      aggregate.parts[1] = {
        questions: q1.map(q => ({
          id: q.id,
          text: q.content.text as string,
          options: q.content.options as string[],
          correctAnswer: q.correct_answer?.optionIndex as number ?? 0,
          audioUrl: q.content.audioUrl as string,
        }))
      };
    }
    
    if (mode === 'full' || mode === 'part2') {
      const q2 = questions.filter(q => q.part_number === 2).sort((a, b) => a.position - b.position);
      aggregate.parts[2] = {
        id: (c.part2 as any)?.id || 14,
        instruction: (c.part2 as any)?.instruction || '',
        audioUrl: (c.part2 as any)?.audioUrl || '',
        speakers: (c.part2 as any)?.speakers || [],
        options: (c.part2 as any)?.options || [],
        answers: q2.map(q => q.correct_answer?.optionLabel as string || ''),
      };
    }
    
    if (mode === 'full' || mode === 'part3') {
      const q3 = questions.filter(q => q.part_number === 3).sort((a, b) => a.position - b.position);
      aggregate.parts[3] = {
        id: (c.part3 as any)?.id || 15,
        context: (c.part3 as any)?.context || '',
        subTitle: (c.part3 as any)?.subTitle || '',
        audioUrl: (c.part3 as any)?.audioUrl || '',
        options: (c.part3 as any)?.options || [],
        statements: q3.map((q, i) => ({
          id: `15${String.fromCharCode(97+i)}`,
          text: q.content.statement as string || '',
          answer: q.correct_answer?.opinion as string || '',
        })),
      };
    }

    if (mode === 'full' || mode === 'part4') {
      const recordings = (c.part4 as any)?.recordings || [];
      const q4 = questions.filter(q => q.part_number === 4);
      aggregate.parts[4] = {
        recordings: recordings.map((rec: any, idx: number) => {
          const recQs = q4.filter(q => (q.content.recordingIndex as number) === idx).sort((a, b) => a.position - b.position);
          return {
            id: rec.id || (16 + idx),
            audioUrl: rec.audioUrl || '',
            context: rec.context || '',
            subQuestions: recQs.map(q => ({
              id: q.id,
              text: q.content.text as string,
              options: q.content.options as string[],
              correctAnswer: q.correct_answer?.optionIndex as number ?? 0,
            })),
          };
        }),
      };
    }

    return aggregate;
  }

  private buildPartContents(aggregate: ListeningTestAggregate): Record<string, unknown> {
    const contents: Record<string, unknown> = { schemaVersion: 1 };
    if (aggregate.parts[2]) {
      contents.part2 = {
        id: aggregate.parts[2].id,
        instruction: aggregate.parts[2].instruction,
        audioUrl: aggregate.parts[2].audioUrl,
        speakers: aggregate.parts[2].speakers,
        options: aggregate.parts[2].options,
      };
    }
    if (aggregate.parts[3]) {
      contents.part3 = {
        id: aggregate.parts[3].id,
        context: aggregate.parts[3].context,
        subTitle: aggregate.parts[3].subTitle,
        audioUrl: aggregate.parts[3].audioUrl,
        options: aggregate.parts[3].options,
      };
    }
    if (aggregate.parts[4]) {
      contents.part4 = {
        recordings: aggregate.parts[4].recordings.map(r => ({
          id: r.id,
          audioUrl: r.audioUrl,
          context: r.context,
        }))
      };
    }
    return contents;
  }

  private async syncQuestions(manager: EntityManager, testId: string, aggregate: ListeningTestAggregate): Promise<void> {
    await manager.query(`UPDATE questions SET deleted_at = now() WHERE test_id = $1 AND deleted_at IS NULL`, [testId]);
    
    if (aggregate.parts[1]) {
      let position = 1;
      for (const q of aggregate.parts[1].questions) {
        await manager.query(
          `INSERT INTO questions (test_id, part_number, position, question_type, content, correct_answer)
           VALUES ($1, 1, $2, 'MCQ_LISTENING_P1', $3, $4)`,
          [testId, position++, { text: q.text, options: q.options, audioUrl: q.audioUrl }, { optionIndex: q.correctAnswer }]
        );
      }
    }
    
    if (aggregate.parts[2]) {
      let position = 1;
      for (const [idx, speaker] of aggregate.parts[2].speakers.entries()) {
        await manager.query(
          `INSERT INTO questions (test_id, part_number, position, question_type, content, correct_answer)
           VALUES ($1, 2, $2, 'MATCHING_LISTENING_P2', $3, $4)`,
          [testId, position++, { speakerLabel: speaker }, { optionLabel: aggregate.parts[2].answers[idx] }]
        );
      }
    }
    
    if (aggregate.parts[3]) {
      let position = 1;
      for (const stmt of aggregate.parts[3].statements) {
        await manager.query(
          `INSERT INTO questions (test_id, part_number, position, question_type, content, correct_answer)
           VALUES ($1, 3, $2, 'OPINION_LISTENING_P3', $3, $4)`,
          [testId, position++, { statement: stmt.text }, { opinion: stmt.answer }]
        );
      }
    }
    
    if (aggregate.parts[4]) {
      let position = 1;
      for (const [idx, rec] of aggregate.parts[4].recordings.entries()) {
        for (const q of rec.subQuestions) {
          await manager.query(
            `INSERT INTO questions (test_id, part_number, position, question_type, content, correct_answer)
             VALUES ($1, 4, $2, 'MCQ_LISTENING_P4', $3, $4)`,
            [testId, position++, { text: q.text, options: q.options, recordingIndex: idx }, { optionIndex: q.correctAnswer }]
          );
        }
      }
    }
  }

  private async audit(manager: EntityManager, actorId: string, action: string, entityId: string, changes: unknown, audit: ListeningAudit): Promise<void> {
    await manager.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, changes, request_id, ip_address)
       VALUES ($1, $2, 'LISTENING_TEST', $3, $4, $5, $6)`,
      [actorId, action, entityId, changes, audit.requestId, audit.ipAddress],
    );
  }
}
