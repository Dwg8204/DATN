import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { AuthUser } from '../../auth/types/auth-user.type';
import { ApplicationError } from '../../../common/errors/application.error';
import { ListeningTestAggregate } from '../types/listening-test.type';
import { SubmitListeningAttemptDto } from '../dto/submit-listening-attempt.dto';
import { TestAttemptsService } from '../../test-attempts/services/test-attempts.service';
import { Answer, AssessmentResult } from '../../test-attempts/types/attempt.type';

@Injectable()
export class ListeningAttemptService {
  constructor(private readonly dataSource: DataSource, private readonly sharedAttempts: TestAttemptsService) {}

  async startAttempt(testId: string, mode: string, actor: AuthUser) {
    const started = await this.sharedAttempts.start(testId, randomUUID(), actor, mode, 'LISTENING');
    return { attemptId: started.attemptId };
  }

  async submitAttempt(testId: string, actor: AuthUser, dto: SubmitListeningAttemptDto) {
    const sharedRow = await this.dataSource.query<Array<{ attempt_id: string }>>(
      `SELECT p.attempt_id FROM attempt_progress p JOIN test_attempts a ON a.id=p.attempt_id
       JOIN test_snapshots s ON s.id=a.snapshot_id
       WHERE p.attempt_id=$1 AND a.student_id=$2 AND s.test_id=$3 AND a.component='LISTENING'`,
      [dto.attemptId, actor.id, testId]);
    if (sharedRow.length) return this.submitSharedAttempt(dto, actor);
    const attemptRows = await this.dataSource.query(
      `SELECT a.id, a.snapshot_id, a.started_at, a.scope, a.part_number FROM test_attempts a
       JOIN test_snapshots s ON s.id=a.snapshot_id
       WHERE a.id = $1 AND a.student_id = $2 AND s.test_id=$3
         AND a.component = 'LISTENING' AND a.status = 'IN_PROGRESS'
         AND NOT EXISTS (SELECT 1 FROM attempt_progress p WHERE p.attempt_id=a.id)`,
      [dto.attemptId, actor.id, testId]
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
      const updated = await manager.query<Array<{ id: string }>>(
        `UPDATE test_attempts 
         SET status = 'SUBMITTED', grading_status = 'COMPLETED',
             score = $1, max_score = $2, estimated_cefr = $3,
             result = $4, submitted_at = now(), completed_at = now()
         WHERE id = $5 AND status = 'IN_PROGRESS' RETURNING id`,
        [totalScore, maxScore, estimatedCefr, result, dto.attemptId]
      );
      if (!updated.length) throw new ApplicationError('ATTEMPT_CONFLICT', 'This test has already been submitted.', 409);

      await manager.query(
        `INSERT INTO attempt_progress (attempt_id, answers, progress)
         VALUES ($1, $2, '{}')
         ON CONFLICT (attempt_id) DO UPDATE SET answers = EXCLUDED.answers`,
        [dto.attemptId, answers]
      );
    });

    return result;
  }

  private async submitSharedAttempt(dto: SubmitListeningAttemptDto, actor: AuthUser) {
    const attempt = await this.sharedAttempts.get(dto.attemptId, actor);
    const rows = await this.dataSource.query<Array<{ snapshot: ListeningTestAggregate }>>(
      `SELECT s.snapshot FROM test_attempts a JOIN test_snapshots s ON s.id=a.snapshot_id WHERE a.id=$1 AND a.student_id=$2`,
      [dto.attemptId, actor.id]);
    const snapshot = rows[0]?.snapshot;
    if (!snapshot) throw new ApplicationError('SNAPSHOT_NOT_FOUND', 'Test snapshot not found.', 404);
    const changes = this.toSharedAnswers(snapshot, dto.answers ?? {});
    const submitted = await this.sharedAttempts.submit(dto.attemptId, actor,
      { expectedRevision: attempt.revision, finalChanges: changes });
    const saved = await this.sharedAttempts.get(dto.attemptId, actor);
    const result = submitted.result as AssessmentResult;
    const partBreakdown: Record<string, Array<Record<string, unknown>>> = {};
    for (const item of result.items) {
      const part = item.partNumber;
      const index = Number(item.key.match(/\d+$/)?.[0] ?? '1') - 1;
      const partKey = `part${part}`;
      const optionId = (saved.answers[item.key] as Answer | undefined)?.kind === 'TEXT' ? undefined
        : (saved.answers[item.key] as { optionId?: string } | undefined)?.optionId;
      let qId: string | number;
      let userAnswer: string | number | undefined;
      let correctAnswer: string | number;
      if (part === 1) {
        const question = snapshot.parts[1]!.questions[index];
        qId = question.id;
        userAnswer = optionId ? Number(optionId.slice(1)) : undefined;
        correctAnswer = question.correctAnswer;
      } else if (part === 2) {
        const section = snapshot.parts[2]!;
        qId = `14.${index + 1}`;
        userAnswer = optionId ? section.options[optionId.charCodeAt(0) - 65] : undefined;
        correctAnswer = section.answers[index];
      } else if (part === 3) {
        const section = snapshot.parts[3]!;
        qId = section.statements[index].id;
        userAnswer = optionId ? section.options[Number(optionId.slice(1))] : undefined;
        correctAnswer = section.statements[index].answer;
      } else {
        const question = snapshot.parts[4]!.recordings.flatMap(recording => recording.subQuestions)[index];
        qId = question.id;
        userAnswer = optionId ? Number(optionId.slice(1)) : undefined;
        correctAnswer = question.correctAnswer;
      }
      (partBreakdown[partKey] ??= []).push({ qId, userAnswer, correctAnswer,
        isCorrect: item.outcome === 'CORRECT', isSkipped: item.outcome === 'SKIPPED' });
    }
    return { score: result.score, maxScore: result.maxScore, estimatedCefr: submitted.estimatedCefr,
      totalCorrect: result.counts.correct, totalWrong: result.counts.incorrect, totalSkip: result.counts.skipped, partBreakdown };
  }

  private toSharedAnswers(snapshot: ListeningTestAggregate, source: NonNullable<SubmitListeningAttemptDto['answers']>): Record<string, Answer> {
    const answers: Record<string, Answer> = {};
    snapshot.parts[1]?.questions.forEach((question, index) => {
      const selected = source.part1?.[question.id];
      if (Number.isInteger(selected)) answers[`p1:q${index + 1}`] = { kind: 'CHOICE', optionId: `o${selected}` };
    });
    snapshot.parts[2]?.speakers.forEach((_, index) => {
      const selected = source.part2?.[String(index)];
      const optionIndex = snapshot.parts[2]!.options.indexOf(selected ?? '');
      if (optionIndex >= 0) answers[`p2:s${index + 1}`] = { kind: 'MATCH', optionId: String.fromCharCode(65 + optionIndex) };
    });
    snapshot.parts[3]?.statements.forEach((statement, index) => {
      const selected = source.part3?.[statement.id];
      const optionIndex = snapshot.parts[3]!.options.indexOf(selected ?? '');
      if (optionIndex >= 0) answers[`p3:s${index + 1}`] = { kind: 'MATCH', optionId: `o${optionIndex}` };
    });
    snapshot.parts[4]?.recordings.flatMap(recording => recording.subQuestions).forEach((question, index) => {
      const selected = source.part4?.[question.id];
      if (Number.isInteger(selected)) answers[`p4:q${index + 1}`] = { kind: 'CHOICE', optionId: `o${selected}` };
    });
    return answers;
  }

  private calculateCefr(score: number): string {
    if (score >= 42) return 'C';
    if (score >= 34) return 'B2';
    if (score >= 24) return 'B1';
    if (score >= 16) return 'A2';
    return 'A1';
  }

}
