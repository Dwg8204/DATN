import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateReadingTestDto } from '../dto/create-reading-test.dto';
import { UpdateReadingTestDto } from '../dto/update-reading-test.dto';
import { QueryReadingTestDto } from '../dto/query-reading-test.dto';
import { CreateQuestionDto } from '../dto/create-question.dto';

export type TestRow = {
  id: string;
  created_by: string;
  title: string;
  component: string;
  scope: string;
  part_number: number | null;
  duration_minutes: number | null;
  version: number;
  published_snapshot_id: string | null;
  status: string;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type QuestionRow = {
  id: string;
  test_id: string;
  part_number: number;
  position: number;
  question_type: string;
  content: Record<string, unknown>;
  correct_answer: Record<string, unknown>;
  explanation: Record<string, unknown> | null;
  created_at: Date;
};

export type TestSnapshotRow = {
  id: string;
  test_id: string;
  version: number;
  snapshot: Record<string, unknown>;
  created_at: Date;
};

@Injectable()
export class ReadingTestsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findTests(query: QueryReadingTestDto): Promise<{ data: TestRow[]; total: number }> {
    const values: unknown[] = ['READING'];
    const where: string[] = ['component = $1'];

    if (query.status) {
      values.push(query.status);
      where.push(`status = $${values.length}`);
    }

    if (query.scope) {
      values.push(query.scope);
      where.push(`scope = $${values.length}`);
    }

    if (query.search) {
      values.push(`%${query.search.trim().toLowerCase()}%`);
      where.push(`lower(title) LIKE $${values.length}`);
    }

    const whereSql = where.join(' AND ');
    const offset = (query.page - 1) * query.pageSize;
    const limitParam = `$${values.length + 1}`;
    const offsetParam = `$${values.length + 2}`;

    const [rows, countRows] = await Promise.all([
      this.dataSource.query<TestRow[]>(
        `SELECT id, created_by, title, component, scope, part_number,
                version, published_snapshot_id, status, published_at, created_at, updated_at
         FROM tests
         WHERE ${whereSql}
         ORDER BY created_at DESC
         LIMIT ${limitParam} OFFSET ${offsetParam}`,
        [...values, query.pageSize, offset],
      ),
      this.dataSource.query<Array<{ total: string }>>(
        `SELECT count(*)::text AS total FROM tests WHERE ${whereSql}`,
        values,
      ),
    ]);

    return { data: rows, total: Number(countRows[0]?.total ?? 0) };
  }

  async findTestById(id: string): Promise<TestRow | null> {
    const rows = await this.dataSource.query<TestRow[]>(
      `SELECT id, created_by, title, component, scope, part_number,
              version, published_snapshot_id, status, published_at, created_at, updated_at
       FROM tests
       WHERE id = $1 AND component = 'READING'
       LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async createTest(creatorId: string, dto: CreateReadingTestDto): Promise<TestRow> {
    const rows = await this.dataSource.query<TestRow[]>(
      `INSERT INTO tests (
        created_by, title, component, scope, part_number, status
      ) VALUES ($1, $2, 'READING', $3, $4, 'DRAFT')
      RETURNING id, created_by, title, component, scope, part_number,
                version, published_snapshot_id, status, published_at, created_at, updated_at`,
      [creatorId, dto.title, dto.scope, dto.partNumber ?? null],
    );
    return rows[0];
  }

  async updateTest(id: string, dto: UpdateReadingTestDto): Promise<TestRow | null> {
    const rows = await this.dataSource.query<TestRow[]>(
      `UPDATE tests
       SET title = COALESCE($1, title),
           part_number = COALESCE($2, part_number),
           updated_at = now()
       WHERE id = $3
       RETURNING id, created_by, title, component, scope, part_number,
                version, published_snapshot_id, status, published_at, created_at, updated_at`,
      [dto.title ?? null, dto.partNumber ?? null, id],
    );
    return rows[0] ?? null;
  }

  async addQuestion(dto: CreateQuestionDto): Promise<QuestionRow> {
    const rows = await this.dataSource.query<QuestionRow[]>(
      `INSERT INTO questions (
        test_id, part_number, position, question_type, content, correct_answer, explanation
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)
      RETURNING id, test_id, part_number, position, question_type, content, correct_answer, explanation, created_at`,
      [
        dto.testId,
        dto.partNumber,
        dto.position,
        dto.questionType,
        JSON.stringify(dto.content),
        JSON.stringify(dto.correctAnswer),
        dto.explanation ? JSON.stringify(dto.explanation) : null,
      ],
    );
    return rows[0];
  }

  async findQuestionsByTestId(testId: string): Promise<QuestionRow[]> {
    return this.dataSource.query<QuestionRow[]>(
      `SELECT id, test_id, part_number, position, question_type, content, correct_answer, explanation, created_at
       FROM questions
       WHERE test_id = $1 AND deleted_at IS NULL
       ORDER BY part_number ASC, position ASC`,
      [testId],
    );
  }

  async publishSnapshot(testId: string): Promise<TestSnapshotRow> {
    return this.dataSource.transaction(async manager => {
      const tests = await manager.query<TestRow[]>(
        `SELECT * FROM tests WHERE id = $1 FOR UPDATE`,
        [testId],
      );
      const test = tests[0];
      if (!test) throw new Error('Test not found');

      const questions = await manager.query<QuestionRow[]>(
        `SELECT id, part_number, position, question_type, content, correct_answer, explanation
         FROM questions WHERE test_id = $1 AND deleted_at IS NULL ORDER BY part_number, position`,
        [testId],
      );

      const snapshotData = {
        testId: test.id,
        title: test.title,
        component: test.component,
        scope: test.scope,
        version: test.version,
        questions: questions.map(q => ({
          id: q.id,
          partNumber: q.part_number,
          position: q.position,
          questionType: q.question_type,
          content: q.content,
          correctAnswer: q.correct_answer,
          explanation: q.explanation,
        })),
      };

      const contentHash = `hash_${Date.now()}`;

      const snapshots = await manager.query<TestSnapshotRow[]>(
        `INSERT INTO test_snapshots (test_id, version, schema_version, snapshot, content_hash)
         VALUES ($1, $2, 1, $3::jsonb, $4)
         RETURNING id, test_id, version, snapshot, created_at`,
        [testId, test.version, JSON.stringify(snapshotData), contentHash],
      );
      const snapshot = snapshots[0];

      await manager.query(
        `UPDATE tests
         SET published_snapshot_id = $1, status = 'PUBLISHED', published_at = now(), updated_at = now()
         WHERE id = $2`,
        [snapshot.id, testId],
      );

      return snapshot;
    });
  }
}
