import { randomUUID, createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ListGrammarTestsQueryDto } from '../dto/list-grammar-tests-query.dto';
import {
  GrammarActor,
  GrammarAudit,
  GrammarTestAggregate,
  GrammarTestMode,
  GrammarTestStatus,
  GrammarTestSummary,
} from '../types/grammar-test.type';

type TestRow = {
  id: string;
  created_by: string;
  title: string;
  scope: 'PART' | 'FULL_SKILL';
  part_number: number | null;
  cover: GrammarTestAggregate['details']['cover'];
  part_contents: { schemaVersion?: number; part1?: { instruction?: string }; sets?: StoredSet[] };
  version: number;
  status: GrammarTestStatus;
  published_snapshot_id: string | null;
  created_at: Date;
  updated_at: Date;
};

type StoredSet = {
  setId: number;
  groupKey: string;
  instruction: string;
  options: Array<{ label: string; text: string }>;
};

type QuestionRow = {
  id: string;
  part_number: number;
  group_key: string | null;
  position: number;
  question_type: string;
  content: { text?: string; options?: string[]; word?: string };
  correct_answer: { optionIndex?: number; label?: string } | null;
  explanation: { text?: string } | null;
};

export type RepositoryMutation =
  | { outcome: 'SUCCESS'; value: GrammarTestAggregate }
  | { outcome: 'NOT_FOUND' | 'FORBIDDEN' | 'VERSION_CONFLICT' };

@Injectable()
export class GrammarTestsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async list(query: ListGrammarTestsQueryDto, actor?: GrammarActor): Promise<{ tests: GrammarTestSummary[]; total: number }> {
    const values: unknown[] = ['GRAMMAR_VOCAB'];
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
        values.push(query.mode === 'part1' ? 1 : 2);
        where.push(`t.part_number = $${values.length}`);
      }
    }
    if (query.status) {
      values.push(query.status);
      where.push(`t.status = $${values.length}`);
    } else {
      where.push(`t.status <> 'ARCHIVED'`);
    }
    const whereSql = where.join(' AND ');
    const offset = (query.page - 1) * query.pageSize;
    const limitIndex = values.length + 1;
    const offsetIndex = values.length + 2;
    const [rows, countRows] = await Promise.all([
      this.dataSource.query<Array<TestRow & { attempts: string }>>(
      `WITH page AS (
         SELECT t.* FROM tests t WHERE ${whereSql}
         ORDER BY t.updated_at DESC, t.id DESC
         LIMIT $${limitIndex} OFFSET $${offsetIndex}
       )
       SELECT p.*, count(ta.id)::text AS attempts
       FROM page p
       LEFT JOIN test_snapshots ts ON ts.test_id = p.id
       LEFT JOIN test_attempts ta ON ta.snapshot_id = ts.id
       GROUP BY p.id, p.created_by, p.updated_by, p.title, p.component, p.scope, p.part_number,
                p.cover, p.part_contents, p.version, p.published_snapshot_id, p.status,
                p.published_at, p.archived_at, p.created_at, p.updated_at
       ORDER BY p.updated_at DESC, p.id DESC`,
        [...values, query.pageSize, offset],
      ),
      this.dataSource.query<Array<{ total: string }>>(
        `SELECT count(*)::text AS total FROM tests t WHERE ${whereSql}`,
        values,
      ),
    ]);
    return {
      tests: rows.map(row => this.toSummary(row, Number(row.attempts), actor)),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async listPublished(query: ListGrammarTestsQueryDto): Promise<{ tests: GrammarTestSummary[]; total: number }> {
    const values: unknown[] = [];
    const where = [`t.component='GRAMMAR_VOCAB'`, 't.published_snapshot_id IS NOT NULL', 't.archived_at IS NULL'];
    if (query.search?.trim()) {
      values.push(`%${query.search.trim().replace(/[%_\\]/g, value => `\\${value}`)}%`);
      where.push(`(ts.snapshot #>> '{details,title}') ILIKE $${values.length} ESCAPE '\\'`);
    }
    if (query.mode) {
      values.push(query.mode);
      where.push(`ts.snapshot->>'mode' = $${values.length}`);
    }
    const whereSql = where.join(' AND ');
    const limitIndex = values.length + 1;
    const offsetIndex = values.length + 2;
    const offset = (query.page - 1) * query.pageSize;
    const [rows, countRows] = await Promise.all([
      this.dataSource.query<Array<{
      id: string; snapshot: GrammarTestAggregate; attempts: string; created_at: Date; updated_at: Date;
      }>>(
      `SELECT t.id, ts.snapshot, t.created_at, t.updated_at, count(ta.id)::text AS attempts
       FROM tests t
       JOIN test_snapshots ts ON ts.id=t.published_snapshot_id
       LEFT JOIN test_attempts ta ON ta.snapshot_id=ts.id
       WHERE ${whereSql}
       GROUP BY t.id, ts.id, t.created_at, t.updated_at
       ORDER BY t.updated_at DESC, t.id DESC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
        [...values, query.pageSize, offset],
      ),
      this.dataSource.query<Array<{ total: string }>>(
        `SELECT count(*)::text AS total FROM tests t
         JOIN test_snapshots ts ON ts.id=t.published_snapshot_id WHERE ${whereSql}`,
        values,
      ),
    ]);
    return {
      tests: rows.map(row => this.snapshotSummary(row.snapshot, row.id, Number(row.attempts), row.created_at, row.updated_at)),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async findAggregate(id: string): Promise<GrammarTestAggregate | null> {
    const rows = await this.dataSource.query<TestRow[]>(
      `SELECT * FROM tests WHERE id = $1 AND component = 'GRAMMAR_VOCAB' LIMIT 1`,
      [id],
    );
    if (!rows[0]) return null;
    const questions = await this.dataSource.query<QuestionRow[]>(
      `SELECT id, part_number, group_key, position, question_type, content, correct_answer, explanation
       FROM questions WHERE test_id = $1 AND deleted_at IS NULL ORDER BY position`,
      [id],
    );
    return this.hydrate(rows[0], questions);
  }

  async findPublishedAggregate(id: string): Promise<GrammarTestAggregate | null> {
    const rows = await this.dataSource.query<Array<{ snapshot: GrammarTestAggregate }>>(
      `SELECT ts.snapshot FROM tests t
       JOIN test_snapshots ts ON ts.id = t.published_snapshot_id
       WHERE t.id = $1 AND t.component = 'GRAMMAR_VOCAB' AND t.archived_at IS NULL
       LIMIT 1`,
      [id],
    );
    return rows[0]?.snapshot ?? null;
  }

  async create(actor: GrammarActor, test: GrammarTestAggregate, audit: GrammarAudit): Promise<GrammarTestAggregate> {
    return this.dataSource.transaction(async manager => {
      const mapping = this.modeColumns(test.mode);
      const storage = this.toStorage(test);
      const rows = await manager.query<TestRow[]>(
        `INSERT INTO tests(created_by, updated_by, title, component, scope, part_number, cover, part_contents, status)
         VALUES($1, $1, $2, 'GRAMMAR_VOCAB', $3, $4, $5::jsonb, $6::jsonb, 'DRAFT') RETURNING *`,
        [actor.id, test.details.title || 'Untitled test', mapping.scope, mapping.partNumber,
          JSON.stringify(test.details.cover ?? null), JSON.stringify(storage.partContents)],
      );
      await this.insertQuestions(manager, rows[0].id, storage.questions);
      await this.audit(manager, actor.id, 'GRAMMAR_TEST_CREATED', rows[0].id, { mode: test.mode }, audit);
      return this.hydrate(rows[0], await this.activeQuestions(manager, rows[0].id));
    });
  }

  async update(id: string, actor: GrammarActor, expectedVersion: number, test: GrammarTestAggregate, audit: GrammarAudit): Promise<RepositoryMutation> {
    return this.dataSource.transaction(async manager => {
      const current = await this.lock(manager, id);
      if (!current) return { outcome: 'NOT_FOUND' };
      if (actor.role === 'TEACHER' && current.created_by !== actor.id) return { outcome: 'FORBIDDEN' };
      if (current.version !== expectedVersion) return { outcome: 'VERSION_CONFLICT' };
      const mapping = this.modeColumns(test.mode);
      const storage = this.toStorage(test);
      const rows = await manager.query<TestRow[]>(
        `UPDATE tests SET title=$2, scope=$3, part_number=$4, cover=$5::jsonb,
           part_contents=$6::jsonb,
           status=CASE WHEN published_snapshot_id IS NULL THEN 'DRAFT'::publication_status ELSE status END,
           version=version+1, updated_by=$7, updated_at=now()
         WHERE id=$1 RETURNING *`,
        [id, test.details.title || 'Untitled test', mapping.scope, mapping.partNumber,
          JSON.stringify(test.details.cover ?? null), JSON.stringify(storage.partContents), actor.id],
      );
      await manager.query(`UPDATE questions SET deleted_at=now(), updated_at=now() WHERE test_id=$1 AND deleted_at IS NULL`, [id]);
      await this.insertQuestions(manager, id, storage.questions);
      await this.audit(manager, actor.id, 'GRAMMAR_TEST_UPDATED', id, { fromVersion: expectedVersion, toVersion: expectedVersion + 1 }, audit);
      return { outcome: 'SUCCESS', value: this.hydrate(rows[0], await this.activeQuestions(manager, id)) };
    });
  }

  async publish(id: string, actor: GrammarActor, expectedVersion: number, snapshot: GrammarTestAggregate, audit: GrammarAudit): Promise<RepositoryMutation> {
    return this.dataSource.transaction(async manager => {
      const current = await this.lock(manager, id);
      if (!current) return { outcome: 'NOT_FOUND' };
      if (actor.role === 'TEACHER' && current.created_by !== actor.id) return { outcome: 'FORBIDDEN' };
      if (current.version !== expectedVersion) return { outcome: 'VERSION_CONFLICT' };
      const snapshotPayload = { ...snapshot, status: 'PUBLISHED' as const, version: current.version };
      const serialized = JSON.stringify(snapshotPayload);
      const contentHash = createHash('sha256').update(serialized).digest('hex');
      const snapshotRows = await manager.query<Array<{ id: string }>>(
        `WITH inserted AS (
           INSERT INTO test_snapshots(test_id, version, schema_version, snapshot, content_hash)
           VALUES($1, $2, 1, $3::jsonb, $4)
           ON CONFLICT(test_id, version) DO NOTHING
           RETURNING id
         )
         SELECT id FROM inserted
         UNION ALL
         SELECT id FROM test_snapshots WHERE test_id=$1 AND version=$2 AND content_hash=$4
         LIMIT 1`,
        [id, current.version, serialized, contentHash],
      );
      if (!snapshotRows[0]) return { outcome: 'VERSION_CONFLICT' };
      const rows = await manager.query<TestRow[]>(
        `UPDATE tests SET status='PUBLISHED', published_snapshot_id=$2, published_at=now(),
           archived_at=NULL, updated_by=$3, updated_at=now() WHERE id=$1 RETURNING *`,
        [id, snapshotRows[0].id, actor.id],
      );
      await this.audit(manager, actor.id, 'GRAMMAR_TEST_PUBLISHED', id, { version: current.version }, audit);
      return { outcome: 'SUCCESS', value: this.hydrate(rows[0], await this.activeQuestions(manager, id)) };
    });
  }

  async archive(id: string, actor: GrammarActor, audit: GrammarAudit): Promise<RepositoryMutation> {
    return this.dataSource.transaction(async manager => {
      const current = await this.lock(manager, id);
      if (!current || current.status === 'ARCHIVED') return { outcome: 'NOT_FOUND' };
      if (actor.role === 'TEACHER' && current.created_by !== actor.id) return { outcome: 'FORBIDDEN' };
      const rows = await manager.query<TestRow[]>(
        `UPDATE tests SET status='ARCHIVED', archived_at=now(), updated_by=$2, updated_at=now()
         WHERE id=$1 RETURNING *`,
        [id, actor.id],
      );
      await this.audit(manager, actor.id, 'GRAMMAR_TEST_ARCHIVED', id, { version: current.version }, audit);
      return { outcome: 'SUCCESS', value: this.hydrate(rows[0], await this.activeQuestions(manager, id)) };
    });
  }

  async findOwner(id: string): Promise<{ createdBy: string; status: GrammarTestStatus } | null> {
    const rows = await this.dataSource.query<Array<{ created_by: string; status: GrammarTestStatus }>>(
      `SELECT created_by, status FROM tests WHERE id=$1 AND component='GRAMMAR_VOCAB' LIMIT 1`, [id],
    );
    return rows[0] ? { createdBy: rows[0].created_by, status: rows[0].status } : null;
  }

  private modeColumns(mode: GrammarTestMode) {
    return mode === 'full'
      ? { scope: 'FULL_SKILL', partNumber: null }
      : { scope: 'PART', partNumber: mode === 'part1' ? 1 : 2 };
  }

  private rowMode(row: Pick<TestRow, 'scope' | 'part_number'>): GrammarTestMode {
    return row.scope === 'FULL_SKILL' ? 'full' : row.part_number === 2 ? 'part2' : 'part1';
  }

  private toStorage(test: GrammarTestAggregate) {
    const sets: StoredSet[] = (test.parts[2]?.sets ?? []).map(set => ({
      setId: set.setId,
      groupKey: randomUUID(),
      instruction: set.instruction,
      options: set.options,
    }));
    const questions = [
      ...(test.parts[1]?.questions ?? []).map(question => ({
        partNumber: 1, groupKey: null, position: question.id, type: 'GRAMMAR_MULTIPLE_CHOICE',
        content: { text: question.text, options: question.options },
        correctAnswer: { optionIndex: question.correctAnswer },
        explanation: question.explanation ? { text: question.explanation } : null,
      })),
      ...(test.parts[2]?.sets ?? []).flatMap((set, setIndex) => set.targetWords.map(target => ({
        partNumber: 2, groupKey: sets[setIndex].groupKey, position: target.id, type: 'VOCABULARY_MATCHING',
        content: { word: target.word }, correctAnswer: { label: target.correctAnswer },
        explanation: target.explanation ? { text: target.explanation } : null,
      }))),
    ];
    return {
      partContents: {
        schemaVersion: 1,
        ...(test.parts[1] ? { part1: { instruction: test.parts[1].instruction } } : {}),
        ...(sets.length ? { sets } : {}),
      },
      questions,
    };
  }

  private async insertQuestions(manager: EntityManager, testId: string, questions: ReturnType<GrammarTestsRepository['toStorage']>['questions']): Promise<void> {
    if (!questions.length) return;
    const values: unknown[] = [];
    const rows = questions.map(question => {
      const start = values.length;
      values.push(testId, question.partNumber, question.groupKey, question.position, question.type,
        JSON.stringify(question.content), JSON.stringify(question.correctAnswer),
        question.explanation ? JSON.stringify(question.explanation) : null);
      return `($${start + 1},$${start + 2},$${start + 3},$${start + 4},$${start + 5},$${start + 6}::jsonb,$${start + 7}::jsonb,$${start + 8}::jsonb)`;
    });
    await manager.query(
      `INSERT INTO questions(test_id,part_number,group_key,position,question_type,content,correct_answer,explanation)
       VALUES ${rows.join(',')}`,
      values,
    );
  }

  private async activeQuestions(manager: EntityManager, id: string): Promise<QuestionRow[]> {
    return manager.query<QuestionRow[]>(
      `SELECT id,part_number,group_key,position,question_type,content,correct_answer,explanation
       FROM questions WHERE test_id=$1 AND deleted_at IS NULL ORDER BY position`, [id],
    );
  }

  private hydrate(row: TestRow, rows: QuestionRow[]): GrammarTestAggregate {
    const mode = this.rowMode(row);
    const aggregate: GrammarTestAggregate = {
      id: row.id,
      mode,
      details: { title: row.title, pictureUrl: row.cover?.url ?? '', cover: row.cover ?? null },
      parts: {}, status: row.status, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
    };
    if (mode === 'part1' || mode === 'full') {
      aggregate.parts[1] = {
        instruction: row.part_contents?.part1?.instruction ?? '',
        questions: rows.filter(question => question.part_number === 1).map(question => ({
          id: question.position,
          text: question.content.text ?? '',
          options: question.content.options ?? [],
          correctAnswer: question.correct_answer?.optionIndex ?? -1,
          ...(question.explanation?.text ? { explanation: question.explanation.text } : {}),
        })),
      };
    }
    if (mode === 'part2' || mode === 'full') {
      aggregate.parts[2] = {
        sets: (row.part_contents?.sets ?? []).map(set => ({
          setId: set.setId,
          instruction: set.instruction,
          options: set.options,
          targetWords: rows.filter(question => question.part_number === 2 && question.group_key === set.groupKey)
            .map(question => ({
              id: question.position,
              word: question.content.word ?? '',
              correctAnswer: question.correct_answer?.label ?? '',
              ...(question.explanation?.text ? { explanation: question.explanation.text } : {}),
            })),
        })),
      };
    }
    return aggregate;
  }

  private toSummary(row: TestRow, attempts: number, actor?: GrammarActor): GrammarTestSummary {
    const mode = this.rowMode(row);
    const canManage = Boolean(actor && (actor.role === 'ADMIN' || row.created_by === actor.id));
    return {
      id: row.id, title: row.title, name: row.title, mode,
      section: mode === 'full' ? 'Full Test' : mode === 'part1' ? 'Part 1' : 'Part 2',
      component: 'Grammar & Vocab', status: row.status, attempts,
      questionType: mode === 'part1' ? 'Multiple Choice' : mode === 'part2' ? 'Word Matching' : 'Mixed',
      pictureUrl: row.cover?.url ?? '', version: row.version,
      createdAt: row.created_at, updatedAt: row.updated_at, dateAdded: row.created_at,
      canEdit: canManage && row.status !== 'ARCHIVED', canDelete: canManage && row.status !== 'ARCHIVED',
    };
  }

  private snapshotSummary(test: GrammarTestAggregate, id: string, attempts: number, createdAt: Date, updatedAt: Date): GrammarTestSummary {
    const mode = test.mode;
    return {
      id, title: test.details.title, name: test.details.title, mode,
      section: mode === 'full' ? 'Full Test' : mode === 'part1' ? 'Part 1' : 'Part 2',
      component: 'Grammar & Vocab', status: 'PUBLISHED', attempts,
      questionType: mode === 'part1' ? 'Multiple Choice' : mode === 'part2' ? 'Word Matching' : 'Mixed',
      pictureUrl: test.details.pictureUrl ?? '', version: test.version ?? 1,
      createdAt, updatedAt, dateAdded: createdAt, canEdit: false, canDelete: false,
    };
  }

  private async lock(manager: EntityManager, id: string): Promise<TestRow | null> {
    const rows = await manager.query<TestRow[]>(
      `SELECT * FROM tests WHERE id=$1 AND component='GRAMMAR_VOCAB' FOR UPDATE`, [id],
    );
    return rows[0] ?? null;
  }

  private async audit(manager: EntityManager, actorId: string, action: string, entityId: string, changes: unknown, audit: GrammarAudit) {
    await manager.query(
      `INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,changes,request_id,ip_address)
       VALUES($1,$2,'GRAMMAR_TEST',$3,$4::jsonb,$5,$6)`,
      [actorId, action, entityId, JSON.stringify(changes), audit.requestId ?? null, audit.ipAddress ?? null],
    );
  }
}
