import { randomUUID, createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ListSpeakingTestsQueryDto } from '../dto/list-speaking-tests-query.dto';
import {
  SpeakingActor,
  SpeakingAudit,
  SpeakingTestAggregate,
  SpeakingTestMode,
  SpeakingTestStatus,
  SpeakingTestSummary,
} from '../types/speaking-test.type';

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
  status: SpeakingTestStatus;
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
  | { outcome: 'SUCCESS'; value: SpeakingTestAggregate }
  | { outcome: 'NOT_FOUND' | 'FORBIDDEN' | 'VERSION_CONFLICT' };

@Injectable()
export class SpeakingTestsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async list(query: ListSpeakingTestsQueryDto, actor?: SpeakingActor): Promise<{ tests: SpeakingTestSummary[]; total: number }> {
    const values: unknown[] = ['SPEAKING'];
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
        (SELECT count(*) FROM test_attempts a WHERE a.component = 'SPEAKING' AND (a.snapshot_id = t.published_snapshot_id OR (a.scope = t.scope AND a.part_number = t.part_number))) as attempts_count
      FROM tests t
      JOIN users u ON u.id = t.created_by
      WHERE ${where.join(' AND ')}
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
      `,
      values,
    );

    return {
      tests: rows.map((row: any): SpeakingTestSummary => {
        const mode = row.scope === 'FULL_SKILL' ? 'full' : `part${row.part_number}`;
        return {
          id: row.id,
          title: row.title,
          name: row.title,
          mode: mode as SpeakingTestMode,
          section: mode === 'full' ? 'Full Test' : `Part ${row.part_number}`,
          component: 'Speaking',
          status: row.status,
          attempts: parseInt(row.attempts_count, 10),
          questionType: 'Speaking',
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

  async listPublished(query: ListSpeakingTestsQueryDto): Promise<{ tests: SpeakingTestSummary[]; total: number }> {
    return this.list({ ...query, status: 'PUBLISHED' });
  }

  async findAggregate(id: string): Promise<SpeakingTestAggregate | null> {
    const rows = await this.dataSource.query(`SELECT * FROM tests WHERE id = $1 AND component = 'SPEAKING'`, [id]);
    if (rows.length === 0) return null;
    const test: TestRow = rows[0];

    const questions = await this.dataSource.query(
      `SELECT * FROM questions WHERE test_id = $1 AND deleted_at IS NULL ORDER BY part_number, position`,
      [id],
    );

    return this.assembleAggregate(test, questions);
  }

  async findPublishedAggregate(id: string): Promise<SpeakingTestAggregate | null> {
    const tests = await this.dataSource.query(`SELECT * FROM tests WHERE id = $1 AND component = 'SPEAKING' AND status = 'PUBLISHED'`, [id]);
    if (tests.length === 0) return null;
    const test: TestRow = tests[0];
    if (!test.published_snapshot_id) return null;
    
    const snapshots = await this.dataSource.query(`SELECT snapshot FROM test_snapshots WHERE id = $1`, [test.published_snapshot_id]);
    if (snapshots.length === 0) return null;
    
    return snapshots[0].snapshot as SpeakingTestAggregate;
  }

  async findOwner(id: string): Promise<{ createdBy: string; status: SpeakingTestStatus } | null> {
    const rows = await this.dataSource.query(`SELECT created_by, status FROM tests WHERE id = $1 AND component = 'SPEAKING'`, [id]);
    if (rows.length === 0) return null;
    return { createdBy: rows[0].created_by, status: rows[0].status };
  }

  async create(actor: SpeakingActor, aggregate: SpeakingTestAggregate, audit: SpeakingAudit): Promise<SpeakingTestAggregate> {
    const id = randomUUID();
    const mode = aggregate.mode;
    const scope = mode === 'full' ? 'FULL_SKILL' : 'PART';
    const partNumber = mode === 'full' ? null : parseInt(mode.replace('part', ''), 10);
    const cover = { pictureUrl: aggregate.details.pictureUrl };
    const contents = this.buildPartContents(aggregate);

    await this.dataSource.transaction(async manager => {
      await manager.query(
        `INSERT INTO tests (id, created_by, title, component, scope, part_number, cover, part_contents, version, status, updated_by)
         VALUES ($1, $2, $3, 'SPEAKING', $4, $5, $6, $7, 1, 'DRAFT', $2)`,
        [id, actor.id, aggregate.details.title, scope, partNumber, cover, contents],
      );
      await this.syncQuestions(manager, id, aggregate);
      await this.audit(manager, actor.id, 'CREATE_SPEAKING_TEST', id, aggregate, audit);
    });
    return (await this.findAggregate(id))!;
  }

  async update(id: string, actor: SpeakingActor, version: number, aggregate: SpeakingTestAggregate, audit: SpeakingAudit): Promise<RepositoryMutation> {
    const mode = aggregate.mode;
    const scope = mode === 'full' ? 'FULL_SKILL' : 'PART';
    const partNumber = mode === 'full' ? null : parseInt(mode.replace('part', ''), 10);
    const cover = { pictureUrl: aggregate.details.pictureUrl };
    const contents = this.buildPartContents(aggregate);

    let outcome: RepositoryMutation['outcome'] = 'SUCCESS';
    await this.dataSource.transaction(async manager => {
      const lock = await manager.query(`SELECT version, created_by FROM tests WHERE id = $1 AND component = 'SPEAKING' FOR UPDATE`, [id]);
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
      await this.audit(manager, actor.id, 'UPDATE_SPEAKING_TEST', id, aggregate, audit);
    });
    if (outcome !== 'SUCCESS') return { outcome };
    return { outcome: 'SUCCESS', value: (await this.findAggregate(id))! };
  }

  async publish(id: string, actor: SpeakingActor, version: number, aggregate: SpeakingTestAggregate, audit: SpeakingAudit): Promise<RepositoryMutation> {
    const cover = { pictureUrl: aggregate.details.pictureUrl };
    const contents = this.buildPartContents(aggregate);
    const snapshotStr = JSON.stringify(aggregate);
    const hash = createHash('sha256').update(snapshotStr).digest('hex');

    let outcome: RepositoryMutation['outcome'] = 'SUCCESS';
    await this.dataSource.transaction(async manager => {
      const lock = await manager.query(`SELECT version, created_by FROM tests WHERE id = $1 AND component = 'SPEAKING' FOR UPDATE`, [id]);
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
      await this.audit(manager, actor.id, 'PUBLISH_SPEAKING_TEST', id, { version: newVersion, snapshotId }, audit);
    });
    if (outcome !== 'SUCCESS') return { outcome };
    return { outcome: 'SUCCESS', value: (await this.findAggregate(id))! };
  }

  async archive(id: string, actor: SpeakingActor, audit: SpeakingAudit): Promise<RepositoryMutation> {
    let outcome: RepositoryMutation['outcome'] = 'SUCCESS';
    await this.dataSource.transaction(async manager => {
      const lock = await manager.query(`SELECT status, created_by FROM tests WHERE id = $1 AND component = 'SPEAKING' FOR UPDATE`, [id]);
      if (lock.length === 0) { outcome = 'NOT_FOUND'; return; }
      if (actor.role === 'TEACHER' && lock[0].created_by !== actor.id) { outcome = 'FORBIDDEN'; return; }
      if (lock[0].status === 'ARCHIVED') return;

      await manager.query(
        `UPDATE tests SET status = 'ARCHIVED', archived_at = now(), updated_by = $1, updated_at = now() WHERE id = $2`,
        [actor.id, id],
      );
      await this.audit(manager, actor.id, 'ARCHIVE_SPEAKING_TEST', id, {}, audit);
    });
    if (outcome !== 'SUCCESS') return { outcome };
    return { outcome: 'SUCCESS', value: null as any };
  }

  private assembleAggregate(test: TestRow, questions: QuestionRow[]): SpeakingTestAggregate {
    const mode = test.scope === 'FULL_SKILL' ? 'full' : `part${test.part_number}`;
    const aggregate: SpeakingTestAggregate = {
      id: test.id,
      mode: mode as SpeakingTestMode,
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
        }))
      };
    }
    
    if (mode === 'full' || mode === 'part2') {
      const q2 = questions.filter(q => q.part_number === 2).sort((a, b) => a.position - b.position);
      aggregate.parts[2] = {
        imageUrl: (c.part2 as any)?.imageUrl || '',
        questions: q2.map(q => ({
          id: q.id,
          text: q.content.text as string,
        })),
      };
    }
    
    if (mode === 'full' || mode === 'part3') {
      const q3 = questions.filter(q => q.part_number === 3).sort((a, b) => a.position - b.position);
      aggregate.parts[3] = {
        imageUrls: (c.part3 as any)?.imageUrls || ['', ''],
        questions: q3.map(q => ({
          id: q.id,
          text: q.content.text as string,
        })),
      };
    }

    if (mode === 'full' || mode === 'part4') {
      const q4 = questions.filter(q => q.part_number === 4).sort((a, b) => a.position - b.position);
      aggregate.parts[4] = {
        topic: (c.part4 as any)?.topic || '',
        imageUrl: (c.part4 as any)?.imageUrl || '',
        questions: q4.map(q => ({
          id: q.id,
          text: q.content.text as string,
        })),
      };
    }

    return aggregate;
  }

  private buildPartContents(aggregate: SpeakingTestAggregate): Record<string, unknown> {
    const contents: Record<string, unknown> = { schemaVersion: 1 };
    if (aggregate.parts[2]) {
      contents.part2 = {
        imageUrl: aggregate.parts[2].imageUrl,
      };
    }
    if (aggregate.parts[3]) {
      contents.part3 = {
        imageUrls: aggregate.parts[3].imageUrls,
      };
    }
    if (aggregate.parts[4]) {
      contents.part4 = {
        topic: aggregate.parts[4].topic,
        imageUrl: aggregate.parts[4].imageUrl,
      };
    }
    return contents;
  }

  private async syncQuestions(manager: EntityManager, testId: string, aggregate: SpeakingTestAggregate): Promise<void> {
    await manager.query(`UPDATE questions SET deleted_at = now() WHERE test_id = $1 AND deleted_at IS NULL`, [testId]);
    
    if (aggregate.parts[1]) {
      let position = 1;
      for (const q of aggregate.parts[1].questions) {
        await manager.query(
          `INSERT INTO questions (test_id, part_number, position, question_type, content, correct_answer)
           VALUES ($1, 1, $2, 'OPEN_SPEAKING_P1', $3, NULL)`,
          [testId, position++, { text: q.text }]
        );
      }
    }
    
    if (aggregate.parts[2]) {
      let position = 1;
      for (const q of aggregate.parts[2].questions) {
        await manager.query(
          `INSERT INTO questions (test_id, part_number, position, question_type, content, correct_answer)
           VALUES ($1, 2, $2, 'OPEN_SPEAKING_P2', $3, NULL)`,
          [testId, position++, { text: q.text }]
        );
      }
    }
    
    if (aggregate.parts[3]) {
      let position = 1;
      for (const q of aggregate.parts[3].questions) {
        await manager.query(
          `INSERT INTO questions (test_id, part_number, position, question_type, content, correct_answer)
           VALUES ($1, 3, $2, 'OPEN_SPEAKING_P3', $3, NULL)`,
          [testId, position++, { text: q.text }]
        );
      }
    }
    
    if (aggregate.parts[4]) {
      let position = 1;
      for (const q of aggregate.parts[4].questions) {
        await manager.query(
          `INSERT INTO questions (test_id, part_number, position, question_type, content, correct_answer)
           VALUES ($1, 4, $2, 'OPEN_SPEAKING_P4', $3, NULL)`,
          [testId, position++, { text: q.text }]
        );
      }
    }
  }

  private async audit(manager: EntityManager, actorId: string, action: string, entityId: string, changes: unknown, audit: SpeakingAudit): Promise<void> {
    await manager.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, changes, request_id, ip_address)
       VALUES ($1, $2, 'SPEAKING_TEST', $3, $4, $5, $6)`,
      [actorId, action, entityId, changes, audit.requestId, audit.ipAddress],
    );
  }
}
