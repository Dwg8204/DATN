import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { AuthUser } from '../../auth/types/auth-user.type';
import { ApplicationError } from '../../../common/errors/application.error';
import { ListeningTestAggregate } from '../types/listening-test.type';
import { SubmitListeningAttemptDto } from '../dto/submit-listening-attempt.dto';

@Injectable()
export class ListeningAttemptService {
  constructor(private readonly dataSource: DataSource) {}

  async startAttempt(testId: string, mode: string, actor: AuthUser) {
    const test = await this.getPublishedTest(testId);
    if (!test) throw new ApplicationError('LISTENING_TEST_NOT_FOUND', 'Test not found or not published.', 404);

    const attemptId = randomUUID();
    const scope = mode === 'full' ? 'FULL_SKILL' : 'PART';
    const partNumber = mode === 'full' ? null : parseInt(mode.replace('part', ''), 10);

    await this.dataSource.query(
      `INSERT INTO test_attempts (id, student_id, snapshot_id, component, scope, part_number, started_at)
       VALUES ($1, $2, $3, 'LISTENING', $4, $5, now())`,
      [attemptId, actor.id, test.published_snapshot_id, scope, partNumber]
    );

    return { attemptId };
  }

  async submitAttempt(testId: string, actor: AuthUser, dto: SubmitListeningAttemptDto) {
    const attemptRows = await this.dataSource.query(
      `SELECT id, snapshot_id, started_at, scope, part_number FROM test_attempts 
       WHERE id = $1 AND student_id = $2 AND component = 'LISTENING' AND status = 'IN_PROGRESS'`,
      [dto.attemptId, actor.id]
    );
    if (!attemptRows.length) {
      throw new ApplicationError('ATTEMPT_NOT_FOUND', 'Attempt not found or already submitted.', 404);
    }

    const attempt = attemptRows[0];
    const snapshotRows = await this.dataSource.query(
      `SELECT snapshot FROM test_snapshots WHERE id = $1`,
      [attempt.snapshot_id]
    );
    if (!snapshotRows.length) {
      throw new ApplicationError('SNAPSHOT_NOT_FOUND', 'Test snapshot not found.', 404);
    }

    const snapshot = snapshotRows[0].snapshot as ListeningTestAggregate;
    const mode = attempt.scope === 'FULL_SKILL' ? 'full' : `part${attempt.part_number}`;
    const answers = dto.answers || {};

    let totalScore = 0;
    let maxScore = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalSkip = 0;
    const partBreakdown: any = {};

    // Part 1: 13 questions
    if ((mode === 'full' || mode === 'part1') && snapshot.parts[1]) {
      const p1Answers: Record<string, number> = answers.part1 || {};
      const p1Breakdown = [];
      for (const q of snapshot.parts[1].questions) {
        maxScore += 2;
        const userAnswer = p1Answers[q.id];
        const isSkipped = userAnswer === undefined || userAnswer === null;
        const isCorrect = !isSkipped && Number(userAnswer) === Number(q.correctAnswer);
        if (isCorrect) {
          totalScore += 2;
          totalCorrect++;
        } else if (isSkipped) {
          totalSkip++;
        } else {
          totalWrong++;
        }
        p1Breakdown.push({
          qId: q.id,
          userAnswer,
          correctAnswer: q.correctAnswer,
          isCorrect,
          isSkipped
        });
      }
      partBreakdown.part1 = p1Breakdown;
    }

    // Part 2: 4 speakers
    if ((mode === 'full' || mode === 'part2') && snapshot.parts[2]) {
      const p2Answers: Record<string, string> = answers.part2 || {};
      const p2Breakdown = [];
      const part2 = snapshot.parts[2];
      for (let i = 0; i < (part2.speakers?.length || 4); i++) {
        maxScore += 2;
        const userAnswer = p2Answers[String(i)];
        const correctAnswer = part2.answers[i];
        const isSkipped = !userAnswer;
        const isCorrect = !isSkipped && userAnswer === correctAnswer;
        if (isCorrect) {
          totalScore += 2;
          totalCorrect++;
        } else if (isSkipped) {
          totalSkip++;
        } else {
          totalWrong++;
        }
        p2Breakdown.push({
          qId: `14.${i + 1}`,
          userAnswer,
          correctAnswer,
          isCorrect,
          isSkipped
        });
      }
      partBreakdown.part2 = p2Breakdown;
    }

    // Part 3: 4 statements
    if ((mode === 'full' || mode === 'part3') && snapshot.parts[3]) {
      const p3Answers: Record<string, string> = answers.part3 || {};
      const p3Breakdown = [];
      const part3 = snapshot.parts[3];
      for (const stmt of part3.statements) {
        maxScore += 2;
        const userAnswer = p3Answers[stmt.id];
        const correctAnswer = stmt.answer;
        const isSkipped = !userAnswer;
        const isCorrect = !isSkipped && userAnswer === correctAnswer;
        if (isCorrect) {
          totalScore += 2;
          totalCorrect++;
        } else if (isSkipped) {
          totalSkip++;
        } else {
          totalWrong++;
        }
        p3Breakdown.push({
          qId: stmt.id,
          userAnswer,
          correctAnswer,
          isCorrect,
          isSkipped
        });
      }
      partBreakdown.part3 = p3Breakdown;
    }

    // Part 4: 2 questions per recording
    if ((mode === 'full' || mode === 'part4') && snapshot.parts[4]) {
      const p4Answers: Record<string, number> = answers.part4 || {};
      const p4Breakdown = [];
      const part4 = snapshot.parts[4];
      for (const rec of part4.recordings) {
        for (const q of rec.subQuestions) {
          maxScore += 2;
          const userAnswer = p4Answers[q.id];
          const isSkipped = userAnswer === undefined || userAnswer === null;
          const isCorrect = !isSkipped && Number(userAnswer) === Number(q.correctAnswer);
          if (isCorrect) {
            totalScore += 2;
            totalCorrect++;
          } else if (isSkipped) {
            totalSkip++;
          } else {
            totalWrong++;
          }
          p4Breakdown.push({
            qId: q.id,
            userAnswer,
            correctAnswer: q.correctAnswer,
            isCorrect,
            isSkipped
          });
        }
      }
      partBreakdown.part4 = p4Breakdown;
    }

    const estimatedCefr = this.calculateCefr(totalScore);

    const result = {
      score: totalScore,
      maxScore,
      estimatedCefr,
      totalCorrect,
      totalWrong,
      totalSkip,
      partBreakdown
    };

    await this.dataSource.transaction(async manager => {
      await manager.query(
        `UPDATE test_attempts 
         SET status = 'SUBMITTED', grading_status = 'COMPLETED',
             score = $1, max_score = $2, estimated_cefr = $3,
             result = $4, submitted_at = now(), completed_at = now()
         WHERE id = $5`,
        [totalScore, maxScore, estimatedCefr, result, dto.attemptId]
      );

      await manager.query(
        `INSERT INTO attempt_progress (attempt_id, answers, progress)
         VALUES ($1, $2, '{}')
         ON CONFLICT (attempt_id) DO UPDATE SET answers = EXCLUDED.answers`,
        [dto.attemptId, answers]
      );
    });

    return result;
  }

  private calculateCefr(score: number): string {
    if (score >= 42) return 'C';
    if (score >= 34) return 'B2';
    if (score >= 24) return 'B1';
    if (score >= 16) return 'A2';
    return 'A1';
  }

  private async getPublishedTest(testId: string) {
    const rows = await this.dataSource.query(
      `SELECT published_snapshot_id FROM tests WHERE id = $1 AND component = 'LISTENING' AND status = 'PUBLISHED'`,
      [testId]
    );
    return rows.length ? rows[0] : null;
  }
}
