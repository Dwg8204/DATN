import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { paginate } from '../../../common/pagination/pagination.dto';
import { AuthUser } from '../../auth/types/auth-user.type';
import { AssessmentPaperFactory } from '../assessments/assessment-paper.factory';
import { applyAnswerChanges } from '../assessments/answer-policy';
import { ObjectiveGraderService } from '../assessments/objective-grader.service';
import { isLegacyListeningResult, legacyListeningAnswers, normalizeLegacyListeningResult } from '../assessments/legacy-listening.adapter';
import { AttemptHistoryQueryDto, SaveProgressDto, SubmitAttemptDto } from '../dto/attempt.dto';
import { TestAttemptsRepository } from '../repositories/test-attempts.repository';
import { AssessmentPaper, AttemptRow, LockedAttemptRow, ProgressRow, SkillComponent } from '../types/attempt.type';
import { examDurationMinutes } from '../policies/exam-time.policy';
import { estimateCefr } from '../policies/exam-cefr.policy';

const COMPONENTS: SkillComponent[] = ['GRAMMAR_VOCAB', 'READING', 'LISTENING', 'WRITING', 'SPEAKING'];

@Injectable()
export class TestAttemptsService {
  private readonly logger = new Logger(TestAttemptsService.name);
  private readonly expiryRetries = new Map<string, { retryAt: number; failures: number }>();
  constructor(
    private readonly repository: TestAttemptsRepository,
    private readonly paperFactory: AssessmentPaperFactory,
    private readonly grader: ObjectiveGraderService,
  ) {}

  async start(testId: string, attemptId: string, actor: AuthUser, expectedMode?: string, expectedComponent?: SkillComponent) {
    const attempt = await this.repository.dataSource.transaction(async manager => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))', [actor.id, testId]);
      const existingId = await this.repository.find(attemptId, actor.id, manager);
      if (existingId) {
        if (existingId.test_id !== testId) this.conflict('This attempt ID belongs to another test.');
        this.assertComponent(expectedComponent, existingId.component);
        this.assertMode(expectedMode, existingId.scope, existingId.part_number);
        return existingId;
      }
      if (await this.repository.idExists(attemptId, manager)) this.conflict('This attempt ID is already in use.');
      const active = await this.repository.active(testId, actor.id, manager);
      if (active) {
        this.assertComponent(expectedComponent, active.component);
        this.assertMode(expectedMode, active.scope, active.part_number);
        return active;
      }
      const test = await this.repository.published(testId, manager);
      if (!test) throw new ApplicationError('TEST_NOT_PUBLISHED', 'This test is unavailable.', 404);
      this.assertComponent(expectedComponent, test.component);
      if (test.schema_version !== 1) throw new ApplicationError('ATTEMPT_INVALID_SNAPSHOT', 'Unsupported test version.', 422);
      const paper = await this.paperFactory.getOrBuild(test.snapshot_id, test.component,
        () => this.repository.snapshot(test.snapshot_id, manager));
      if (expectedMode && paper.mode !== expectedMode) {
        throw new ApplicationError('ATTEMPT_MODE_MISMATCH', 'The published test mode has changed. Refresh the test list.', 409);
      }
      const scope = paper.mode === 'full' ? 'FULL_SKILL' : 'PART';
      const partNumber = scope === 'PART' ? Number(paper.mode.slice(4)) : null;
      await manager.query(
        `INSERT INTO test_attempts(id,student_id,snapshot_id,component,scope,part_number,expires_at)
         VALUES($1,$2,$3,$4,$5,$6,now() + ($7::integer * interval '1 minute'))`,
        [attemptId, actor.id, test.snapshot_id, test.component, scope, partNumber,
          examDurationMinutes(test.component)]);
      await manager.query('INSERT INTO attempt_progress(attempt_id) VALUES($1)', [attemptId]);
      const created = await this.repository.find(attemptId, actor.id, manager);
      if (!created) throw new Error('New attempt was not found.');
      return created;
    });
    return this.present(attempt);
  }

  async get(attemptId: string, actor: AuthUser) {
    return this.present(await this.owned(attemptId, actor));
  }

  async save(attemptId: string, actor: AuthUser, dto: SaveProgressDto) {
    const metadata = await this.repository.metadata(attemptId, actor.id);
    if (!metadata) this.notFound();
    const paper = await this.paperFactory.getOrBuild(metadata.snapshot_id, metadata.component,
      () => this.repository.snapshot(metadata.snapshot_id));
    return this.repository.dataSource.transaction(async manager => {
      const progress = await this.repository.progress(attemptId, manager, true);
      const attempt = await this.repository.lockAttempt(attemptId, actor.id, manager);
      if (!progress || !attempt) this.notFound();
      const serverTime = await this.repository.serverTime(manager);
      this.assertWritable(attempt, progress, dto.expectedRevision, serverTime);
      if (attempt.snapshot_id !== metadata.snapshot_id) this.conflict('This test changed while saving.');
      const answers = applyAnswerChanges(progress.answers, dto.changes, paper.items);
      if (dto.currentQuestionKey && !paper.items.some(item => item.key === dto.currentQuestionKey)) {
        throw new ApplicationError('ATTEMPT_UNKNOWN_QUESTION', 'Current question does not belong to this test.', 422);
      }
      const navigation = dto.currentQuestionKey ? { currentQuestionKey: dto.currentQuestionKey } : progress.progress;
      const saved = await this.repository.saveProgress(manager, attemptId, answers, progress.revision + 1, navigation);
      return { attemptId, revision: saved.revision, savedAt: saved.saved_at, progress: saved.progress };
    });
  }

  async submit(attemptId: string, actor: AuthUser, dto: SubmitAttemptDto) {
    const metadata = await this.repository.metadata(attemptId, actor.id);
    if (!metadata) this.notFound();
    const paper = await this.paperFactory.getOrBuild(metadata.snapshot_id, metadata.component,
      () => this.repository.snapshot(metadata.snapshot_id));
    return this.repository.dataSource.transaction(async manager => {
      // All writers lock progress first and then the attempt row.
      const progress = await this.repository.progress(attemptId, manager, true);
      const attempt = await this.repository.lockAttempt(attemptId, actor.id, manager);
      if (!progress || !attempt) this.notFound();
      if (attempt.status === 'SUBMITTED') return this.resultSummary(attempt);
      this.assertWritable(attempt, progress, dto.expectedRevision);
      if (attempt.snapshot_id !== metadata.snapshot_id) this.conflict('This test changed while submitting.');
      const serverTime = await this.repository.serverTime(manager);
      const expired = !!attempt.expires_at && new Date(attempt.expires_at).getTime() <= new Date(serverTime).getTime();
      const answers = expired ? progress.answers : applyAnswerChanges(progress.answers, dto.finalChanges ?? {}, paper.items);
      if (!expired && dto.finalChanges && Object.keys(dto.finalChanges).length) {
        await this.repository.saveProgress(manager, attemptId, answers, progress.revision + 1, progress.progress);
      }
      const result = this.grader.grade(paper.items, answers);
      const cefr = result.score != null && result.maxScore != null ? estimateCefr(metadata.component, result.score, result.maxScore) : null;
      await manager.query('UPDATE attempt_progress SET sealed_at=now() WHERE attempt_id=$1 AND sealed_at IS NULL', [attemptId]);
      const completed = await this.repository.complete(manager, attemptId, result, serverTime, cefr);
      return this.resultSummary(completed);
    });
  }

  async result(attemptId: string, actor: AuthUser) {
    const attempt = await this.ownedSummary(attemptId, actor);
    if (attempt.status !== 'SUBMITTED') throw new ApplicationError('ATTEMPT_NOT_SUBMITTED', 'Submit this test before viewing its result.', 409);
    return this.resultSummary(attempt);
  }

  async details(attemptId: string, partNumber: number, actor: AuthUser) {
    const attempt = await this.owned(attemptId, actor);
    if (attempt.status !== 'SUBMITTED' || !attempt.result) {
      throw new ApplicationError('ATTEMPT_NOT_SUBMITTED', 'Submit this test before viewing its answers.', 409);
    }
    const paper = await this.paperFactory.getOrBuild(attempt.snapshot_id, attempt.component,
      () => this.repository.snapshot(attempt.snapshot_id));
    const legacyResult = attempt.component === 'LISTENING' && isLegacyListeningResult(attempt.result) ? attempt.result : null;
    const progress = legacyResult ? null : await this.repository.progress(attemptId);
    if (!progress && !legacyResult) this.notFound();
    const items = paper.items.filter(item => item.partNumber === partNumber);
    if (!items.length) throw new ApplicationError('ATTEMPT_PART_NOT_FOUND', 'This part does not belong to the test.', 404);
    const result = legacyResult ? normalizeLegacyListeningResult(legacyResult) : attempt.result;
    if (!result || !('items' in result) || !Array.isArray(result.items)) {
      throw new ApplicationError('ATTEMPT_RESULT_UNSUPPORTED', 'This result format is not supported.', 422);
    }
    const part = paper.parts[String(partNumber)] as { options?: Array<{ id: string; text: string }> };
    const answers = legacyResult ? legacyListeningAnswers(partNumber, legacyResult, part.options ?? []) : progress!.answers;
    const outcomes = new Map(result.items.map(outcome => [outcome.key, outcome]));
    return {
      attemptId, partNumber, paper: paper.parts[String(partNumber)],
      items: items.map(item => ({
        key: item.key,
        selectedAnswer: answers[item.key] ?? null,
        correctAnswer: item.correctOptionId ?? null,
        explanation: item.explanation ?? null,
        sampleAnswer: item.sampleAnswer ?? null,
        outcome: outcomes.get(item.key) ?? null,
      })),
    };
  }

  async history(actor: AuthUser, query: AttemptHistoryQueryDto) {
    if (query.component && !COMPONENTS.includes(query.component as SkillComponent)) {
      throw new ApplicationError('ATTEMPT_INVALID_COMPONENT', 'Choose a valid skill.', 400);
    }
    const found = await this.repository.history(actor.id, query.component as SkillComponent | undefined,
      query.page, query.pageSize, query.mode, query.search, query.sort);
    return paginate(found.rows, found.total, query);
  }

  async states(actor: AuthUser, rawTestIds: string) {
    const testIds = [...new Set(rawTestIds.split(',').map(id => id.trim()).filter(Boolean))];
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!testIds.length || testIds.length > 100 || testIds.some(id => !uuid.test(id))) {
      throw new ApplicationError('ATTEMPT_INVALID_TEST_IDS', 'Choose between 1 and 100 valid tests.', 400);
    }
    return { data: await this.repository.states(actor.id, testIds) };
  }

  async finalizeExpiredBatch(limit = 25): Promise<number> {
    let processed = 0;
    for (let index = 0; index < limit; index += 1) {
      let attemptId: string | undefined;
      try {
        const found = await this.repository.dataSource.transaction(async manager => {
          const now = Date.now();
          const excluded = [...this.expiryRetries].filter(([, retry]) => retry.retryAt > now).map(([id]) => id);
          const [progress] = await this.repository.dueProgress(manager, excluded);
          if (!progress) return false;
          attemptId = progress.attempt_id;
          const attempt = await this.repository.lockAttempt(progress.attempt_id, progress.student_id, manager);
          if (!attempt || attempt.status !== 'IN_PROGRESS') return true;
          const paper = await this.paperFactory.getOrBuild(attempt.snapshot_id, attempt.component,
            () => this.repository.snapshot(attempt.snapshot_id, manager));
          const result = this.grader.grade(paper.items, progress.answers);
          await manager.query('UPDATE attempt_progress SET sealed_at=now() WHERE attempt_id=$1', [attempt.id]);
          await this.repository.complete(manager, attempt.id, result);
          this.expiryRetries.delete(attempt.id);
          return true;
        });
        if (!found) break;
        processed += 1;
      } catch (error) {
        if (!attemptId) throw error;
        const failures = (this.expiryRetries.get(attemptId)?.failures ?? 0) + 1;
        this.expiryRetries.set(attemptId, { failures, retryAt: Date.now() + Math.min(30_000 * 2 ** (failures - 1), 300_000) });
        this.logger.error(`Could not finalize expired attempt ${attemptId}. Retrying later.`, error instanceof Error ? error.stack : undefined);
      }
    }
    return processed;
  }

  private async present(attempt: AttemptRow) {
    const [progress, serverTime] = await Promise.all([
      this.repository.progress(attempt.id), this.repository.serverTime(),
    ]);
    const legacyResult = attempt.component === 'LISTENING' && isLegacyListeningResult(attempt.result) ? attempt.result : null;
    if (!progress && !legacyResult) this.notFound();
    const paper = await this.paperFactory.getOrBuild(attempt.snapshot_id, attempt.component,
      () => this.repository.snapshot(attempt.snapshot_id));
    const answers = legacyResult
      ? Object.assign({}, ...[1, 2, 3, 4].map(partNumber => {
        const part = paper.parts[String(partNumber)] as { options?: Array<{ id: string; text: string }> } | undefined;
        return legacyListeningAnswers(partNumber, legacyResult, part?.options ?? []);
      })) : progress!.answers;
    const effectiveStatus = progress?.sealed_at ? 'SUBMITTED' : attempt.status;
    return {
      attemptId: attempt.id, testId: attempt.test_id, snapshotVersion: attempt.version,
      component: attempt.component, scope: attempt.scope, partNumber: attempt.part_number,
      status: effectiveStatus, gradingStatus: attempt.grading_status,
      startedAt: attempt.started_at, expiresAt: attempt.expires_at, serverTime,
      canAnswer: effectiveStatus === 'IN_PROGRESS' && !progress?.sealed_at &&
        (!attempt.expires_at || new Date(attempt.expires_at).getTime() > new Date(serverTime).getTime()),
      revision: progress?.revision ?? 0, answers, progress: progress?.progress ?? {}, paper: this.safePaper(paper),
    };
  }

  private safePaper(paper: AssessmentPaper) {
    return { component: paper.component, title: paper.title, mode: paper.mode, parts: paper.parts,
      items: paper.items.map(({ key, partNumber, kind, optionIds }) => ({ key, partNumber, kind, optionIds })) };
  }

  private resultSummary(attempt: LockedAttemptRow) {
    const result = attempt.component === 'LISTENING' && isLegacyListeningResult(attempt.result)
      ? normalizeLegacyListeningResult(attempt.result) : attempt.result;
    return { attemptId: attempt.id, status: attempt.status, gradingStatus: attempt.grading_status,
      score: attempt.score == null ? null : Number(attempt.score),
      maxScore: attempt.max_score == null ? null : Number(attempt.max_score),
      estimatedCefr: attempt.estimated_cefr, result, submittedAt: attempt.submitted_at,
      completedAt: attempt.completed_at, startedAt: attempt.started_at, expiresAt: attempt.expires_at,
      submittedAfterExpiry: !!attempt.expires_at && !!attempt.submitted_at &&
        new Date(attempt.submitted_at).getTime() >= new Date(attempt.expires_at).getTime() };
  }

  private async owned(attemptId: string, actor: AuthUser) {
    const attempt = await this.repository.find(attemptId, actor.id);
    if (!attempt) this.notFound();
    return attempt;
  }

  private async ownedSummary(attemptId: string, actor: AuthUser) {
    const attempt = await this.repository.findSummary(attemptId, actor.id);
    if (!attempt) this.notFound();
    return attempt;
  }

  private assertWritable(attempt: LockedAttemptRow, progress: ProgressRow, expectedRevision: number, serverTime?: Date) {
    if (attempt.status !== 'IN_PROGRESS' || progress.sealed_at) this.conflict('This test has already been submitted.');
    if (progress.revision !== expectedRevision) {
      throw new ApplicationError('ATTEMPT_REVISION_CONFLICT', 'Your progress changed elsewhere. Reload before saving.', 409,
        { currentRevision: progress.revision });
    }
    if (serverTime && attempt.expires_at && new Date(attempt.expires_at).getTime() <= new Date(serverTime).getTime()) {
      throw new ApplicationError('ATTEMPT_EXPIRED', 'The time limit has expired. Submit the saved answers to see your result.', 409);
    }
  }

  private notFound(): never { throw new ApplicationError('ATTEMPT_NOT_FOUND', 'Test attempt not found.', 404); }
  private conflict(message: string): never { throw new ApplicationError('ATTEMPT_CONFLICT', message, 409); }

  private assertMode(expectedMode: string | undefined, scope: AttemptRow['scope'], partNumber: number | null): void {
    if (!expectedMode) return;
    const actualMode = scope === 'FULL_SKILL' ? 'full' : `part${partNumber}`;
    if (actualMode !== expectedMode) {
      throw new ApplicationError('ATTEMPT_MODE_MISMATCH', 'An active test uses another mode. Refresh the test list.', 409);
    }
  }

  private assertComponent(expected: SkillComponent | undefined, actual: SkillComponent): void {
    if (expected && expected !== actual) {
      throw new ApplicationError('ATTEMPT_COMPONENT_MISMATCH', 'This test belongs to another skill.', 409);
    }
  }
}
