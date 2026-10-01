import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GradingSummary } from '../services/reading-grader.service';

export type TestAttemptRow = {
  id: string;
  student_id: string;
  snapshot_id: string;
  component: string;
  scope: string;
  part_number: number | null;
  status: string;
  grading_status: string;
  result: GradingSummary | null;
  score: number | null;
  max_score: number | null;
  estimated_cefr: string | null;
  started_at: Date;
  submitted_at: Date | null;
  completed_at: Date | null;
};

export type AttemptProgressRow = {
  attempt_id: string;
  answers: Record<string, unknown>;
  progress: Record<string, unknown>;
  revision: number;
  saved_at: Date;
};

@Injectable()
export class ReadingAttemptsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async createAttempt(
    studentId: string,
    snapshotId: string,
    scope: string,
    partNumber?: number,
  ): Promise<TestAttemptRow> {
    return this.dataSource.transaction(async manager => {
      const attempts = await manager.query<TestAttemptRow[]>(
        `INSERT INTO test_attempts (
          student_id, snapshot_id, component, scope, part_number, status, grading_status, started_at
        ) VALUES ($1, $2, 'READING', $3, $4, 'IN_PROGRESS', 'NOT_STARTED', now())
        RETURNING id, student_id, snapshot_id, component, scope, part_number,
                  status, grading_status, result, score, max_score, estimated_cefr, started_at, submitted_at, completed_at`,
        [studentId, snapshotId, scope, partNumber ?? null],
      );
      const attempt = attempts[0];

      await manager.query(
        `INSERT INTO attempt_progress (attempt_id, answers, progress, revision, saved_at)
         VALUES ($1, '{}'::jsonb, '{}'::jsonb, 0, now())`,
        [attempt.id],
      );

      return attempt;
    });
  }

  async findAttemptById(attemptId: string): Promise<TestAttemptRow | null> {
    const rows = await this.dataSource.query<TestAttemptRow[]>(
      `SELECT id, student_id, snapshot_id, component, scope, part_number,
              status, grading_status, result, score, max_score, estimated_cefr, started_at, submitted_at, completed_at
       FROM test_attempts
       WHERE id = $1
       LIMIT 1`,
      [attemptId],
    );
    return rows[0] ?? null;
  }

  async saveProgress(
    attemptId: string,
    answers?: Record<string, unknown>,
    progress?: Record<string, unknown>,
  ): Promise<AttemptProgressRow> {
    const rows = await this.dataSource.query<AttemptProgressRow[]>(
      `UPDATE attempt_progress
       SET answers = COALESCE($1::jsonb, answers),
           progress = COALESCE($2::jsonb, progress),
           revision = revision + 1,
           saved_at = now()
       WHERE attempt_id = $3
       RETURNING attempt_id, answers, progress, revision, saved_at`,
      [answers ? JSON.stringify(answers) : null, progress ? JSON.stringify(progress) : null, attemptId],
    );
    return rows[0];
  }

  async findProgress(attemptId: string): Promise<AttemptProgressRow | null> {
    const rows = await this.dataSource.query<AttemptProgressRow[]>(
      `SELECT attempt_id, answers, progress, revision, saved_at
       FROM attempt_progress
       WHERE attempt_id = $1
       LIMIT 1`,
      [attemptId],
    );
    return rows[0] ?? null;
  }

  async submitAttempt(attemptId: string, summary: GradingSummary): Promise<TestAttemptRow> {
    const rows = await this.dataSource.query<TestAttemptRow[]>(
      `UPDATE test_attempts
       SET status = 'SUBMITTED',
           grading_status = 'COMPLETED',
           result = $1::jsonb,
           score = $2,
           max_score = $3,
           estimated_cefr = $4,
           submitted_at = now(),
           completed_at = now(),
           updated_at = now()
       WHERE id = $5
       RETURNING id, student_id, snapshot_id, component, scope, part_number,
                 status, grading_status, result, score, max_score, estimated_cefr, started_at, submitted_at, completed_at`,
      [
        JSON.stringify(summary),
        summary.scaledScore,
        50,
        summary.cefrLevel,
        attemptId,
      ],
    );
    return rows[0];
  }
}
