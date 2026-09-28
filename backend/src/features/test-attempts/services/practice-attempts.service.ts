import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { paginate } from '../../../common/pagination/pagination.dto';
import { AuthUser } from '../../auth/types/auth-user.type';
import { AssessmentPaperFactory } from '../assessments/assessment-paper.factory';
import { applyAnswerChanges } from '../assessments/answer-policy';
import { ObjectiveGraderService } from '../assessments/objective-grader.service';
import { AttemptHistoryQueryDto } from '../dto/attempt.dto';
import { CompletePracticeAttemptDto, StartPracticeAttemptDto } from '../dto/practice-attempt.dto';
import { TestAttemptsRepository } from '../repositories/test-attempts.repository';
import { AssessmentPaper, AssessmentResult, AttemptRow, LockedAttemptRow, SkillComponent } from '../types/attempt.type';

const COMPONENTS: SkillComponent[] = ['GRAMMAR_VOCAB', 'READING', 'LISTENING', 'WRITING', 'SPEAKING'];

@Injectable()
export class PracticeAttemptsService {
  constructor(
    private readonly repository: TestAttemptsRepository,
    private readonly papers: AssessmentPaperFactory,
    private readonly grader: ObjectiveGraderService,
  ) {}

  async start(dto: StartPracticeAttemptDto, actor: AuthUser) {
    const attempt = await this.repository.dataSource.transaction(async manager => {
      // Serialize starts for the same learner and test. This keeps a double-click
      // from creating two independent, non-resumable practice sessions.
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))', [actor.id, dto.testId]);
      const existing = await this.repository.find(dto.attemptId, actor.id, manager);
      if (existing) {
        if (existing.test_id !== dto.testId || existing.purpose !== 'PRACTICE') this.conflict('This attempt ID is already in use.');
        return existing;
      }
      if (await this.repository.idExists(dto.attemptId, manager)) this.conflict('This attempt ID is already in use.');
      // Practice has no resume contract. Starting the same exercise again removes
      // its unfinished predecessor while completed history remains immutable.
      await manager.query(
        `DELETE FROM test_attempts a USING test_snapshots s
         WHERE a.snapshot_id=s.id AND a.student_id=$1 AND s.test_id=$2
           AND a.purpose='PRACTICE' AND a.status='IN_PROGRESS'`,
        [actor.id, dto.testId],
      );
      // Bound abandoned data from hard-closes where the browser could not call
      // the explicit abandon endpoint.
      await manager.query(
        `DELETE FROM test_attempts WHERE student_id=$1 AND purpose='PRACTICE' AND status='IN_PROGRESS'
         AND started_at < clock_timestamp() - interval '24 hours'`, [actor.id],
      );
      const test = await this.repository.published(dto.testId, manager);
      if (!test || test.purpose !== 'PRACTICE') {
        throw new ApplicationError('PRACTICE_NOT_AVAILABLE', 'This practice test is unavailable.', 404);
      }
      const paper = await this.papers.getOrBuild(test.snapshot_id, test.component,
        () => this.repository.snapshot(test.snapshot_id, manager));
      if (dto.mode && dto.mode !== paper.mode) {
        throw new ApplicationError('PRACTICE_MODE_MISMATCH', 'The published practice mode has changed. Refresh the list.', 409);
      }
      const scope = paper.mode === 'full' ? 'FULL_SKILL' : 'PART';
      const partNumber = scope === 'PART' ? Number(paper.mode.slice(4)) : null;
      await manager.query(
        `INSERT INTO test_attempts(id,student_id,snapshot_id,component,purpose,scope,part_number,expires_at)
         VALUES($1,$2,$3,$4,'PRACTICE',$5,$6,NULL)`,
        [dto.attemptId, actor.id, test.snapshot_id, test.component, scope, partNumber],
      );
      const created = await this.repository.find(dto.attemptId, actor.id, manager);
      if (!created) throw new Error('New practice attempt was not found.');
      return created;
    });
    return this.present(attempt);
  }

  async get(attemptId: string, actor: AuthUser) {
    return this.present(await this.owned(attemptId, actor));
  }

  async reveal(attemptId: string, key: string, actor: AuthUser) {
    const attempt = await this.owned(attemptId, actor);
    if (attempt.status !== 'IN_PROGRESS') this.conflict('Only an active practice attempt can reveal answers.');
    const paper = await this.paper(attempt);
    const item = paper.items.find(candidate => candidate.key === key);
    if (!item) throw new ApplicationError('PRACTICE_UNKNOWN_QUESTION', 'This question does not belong to the practice test.', 422);
    return {
      attemptId,
      key,
      correctAnswer: item.correctOptionId ?? null,
      explanation: item.explanation ?? null,
      sampleAnswer: item.sampleAnswer ?? null,
    };
  }

  async complete(attemptId: string, dto: CompletePracticeAttemptDto, actor: AuthUser) {
    const metadata = await this.repository.metadata(attemptId, actor.id);
    if (!metadata) this.notFound();
    if (metadata.purpose !== 'PRACTICE') this.conflict('This attempt belongs to the exam flow.');
    const paper = await this.papers.getOrBuild(metadata.snapshot_id, metadata.component,
      () => this.repository.snapshot(metadata.snapshot_id));
    const answers = applyAnswerChanges({}, dto.answers, paper.items);
    const knownKeys = new Set(paper.items.map(item => item.key));
    const revealedKeys = [...new Set(dto.revealedKeys)].filter(key => knownKeys.has(key));

    return this.repository.dataSource.transaction(async manager => {
      const attempt = await this.repository.lockAttempt(attemptId, actor.id, manager);
      if (!attempt) this.notFound();
      if (attempt.purpose !== 'PRACTICE') this.conflict('This attempt belongs to the exam flow.');
      if (attempt.status === 'SUBMITTED') return this.summary(attempt);
      if (attempt.status !== 'IN_PROGRESS') this.conflict('This practice attempt is no longer active.');
      const graded = this.grader.grade(paper.items, answers);
      const result: AssessmentResult = {
        ...graded,
        method: graded.method === 'PENDING_AI' ? 'UNASSESSED' : graded.method,
        assistance: { revealedKeys },
      };
      await manager.query(
        `INSERT INTO attempt_progress(attempt_id,answers,progress,revision,saved_at,sealed_at)
         VALUES($1,$2::jsonb,'{}'::jsonb,0,clock_timestamp(),clock_timestamp())`,
        [attemptId, JSON.stringify(answers)],
      );
      const completed = await this.repository.complete(manager, attemptId, result, undefined, null);
      return this.summary(completed);
    });
  }

  async abandon(attemptId: string, actor: AuthUser) {
    return this.repository.dataSource.transaction(async manager => {
      const attempt = await this.repository.lockAttempt(attemptId, actor.id, manager);
      if (!attempt) this.notFound();
      if (attempt.purpose !== 'PRACTICE') this.conflict('This attempt belongs to the exam flow.');
      if (attempt.status === 'SUBMITTED') return this.summary(attempt);
      if (attempt.status === 'IN_PROGRESS') {
        await manager.query(
          `DELETE FROM test_attempts WHERE id=$1 AND purpose='PRACTICE' AND status='IN_PROGRESS'`, [attemptId],
        );
      }
      return { attemptId, status: 'ABANDONED' };
    });
  }

  async result(attemptId: string, actor: AuthUser) {
    const attempt = await this.ownedSummary(attemptId, actor);
    if (attempt.status !== 'SUBMITTED') {
      throw new ApplicationError('PRACTICE_NOT_COMPLETED', 'Complete this practice test before viewing its result.', 409);
    }
    return this.summary(attempt);
  }

  async details(attemptId: string, partNumber: number, actor: AuthUser) {
    const attempt = await this.owned(attemptId, actor);
    if (attempt.status !== 'SUBMITTED' || !attempt.result) {
      throw new ApplicationError('PRACTICE_NOT_COMPLETED', 'Complete this practice test before viewing its answers.', 409);
    }
    const [paper, progress] = await Promise.all([this.paper(attempt), this.repository.progress(attemptId)]);
    if (!progress) this.notFound();
    const items = paper.items.filter(item => item.partNumber === partNumber);
    if (!items.length) throw new ApplicationError('PRACTICE_PART_NOT_FOUND', 'This part does not belong to the practice test.', 404);
    const result = this.assessmentResult(attempt.result);
    const outcomes = new Map(result.items.map(outcome => [outcome.key, outcome]));
    const revealed = new Set(result.assistance?.revealedKeys ?? []);
    return {
      attemptId, purpose: 'PRACTICE', component: attempt.component, partNumber,
      paper: paper.parts[String(partNumber)],
      items: items.map(item => ({
        key: item.key,
        selectedAnswer: progress.answers[item.key] ?? null,
        correctAnswer: item.correctOptionId ?? null,
        explanation: item.explanation ?? null,
        sampleAnswer: item.sampleAnswer ?? null,
        revealed: revealed.has(item.key),
        outcome: outcomes.get(item.key) ?? null,
      })),
    };
  }

  async history(query: AttemptHistoryQueryDto, actor: AuthUser) {
    if (query.component && !COMPONENTS.includes(query.component as SkillComponent)) {
      throw new ApplicationError('ATTEMPT_INVALID_COMPONENT', 'Choose a valid skill.', 400);
    }
    const found = await this.repository.history(actor.id, query.component as SkillComponent | undefined,
      query.page, query.pageSize, query.mode, query.search, query.sort, 'PRACTICE');
    return paginate(found.rows, found.total, query);
  }

  async states(rawTestIds: string, actor: AuthUser) {
    const ids = this.testIds(rawTestIds);
    return { data: await this.repository.states(actor.id, ids, 'PRACTICE') };
  }

  private async present(attempt: AttemptRow) {
    const paper = await this.paper(attempt);
    return {
      attemptId: attempt.id, testId: attempt.test_id, snapshotVersion: attempt.version,
      component: attempt.component, purpose: 'PRACTICE', scope: attempt.scope, partNumber: attempt.part_number,
      status: attempt.status, gradingStatus: attempt.grading_status, startedAt: attempt.started_at,
      expiresAt: null, canAnswer: attempt.status === 'IN_PROGRESS', answers: {}, progress: {},
      paper: this.safePaper(paper),
    };
  }

  private safePaper(paper: AssessmentPaper) {
    return { component: paper.component, title: paper.title, mode: paper.mode, parts: paper.parts,
      items: paper.items.map(({ key, partNumber, kind, optionIds, maxCharacters }) =>
        ({ key, partNumber, kind, optionIds, ...(maxCharacters ? { maxCharacters } : {}) })) };
  }

  private summary(attempt: LockedAttemptRow) {
    return {
      attemptId: attempt.id, testId: attempt.test_id ?? null, title: attempt.test_title ?? null,
      purpose: 'PRACTICE', component: attempt.component, scope: attempt.scope, partNumber: attempt.part_number,
      status: attempt.status, gradingStatus: attempt.grading_status,
      score: attempt.score == null ? null : Number(attempt.score),
      maxScore: attempt.max_score == null ? null : Number(attempt.max_score),
      estimatedCefr: null, result: attempt.result, submittedAt: attempt.submitted_at,
      completedAt: attempt.completed_at, startedAt: attempt.started_at, expiresAt: null,
    };
  }

  private async paper(attempt: Pick<AttemptRow, 'snapshot_id' | 'component'>) {
    return this.papers.getOrBuild(attempt.snapshot_id, attempt.component,
      () => this.repository.snapshot(attempt.snapshot_id));
  }

  private async owned(id: string, actor: AuthUser) {
    const attempt = await this.repository.find(id, actor.id);
    if (!attempt) this.notFound();
    if (attempt.purpose !== 'PRACTICE') this.conflict('This attempt belongs to the exam flow.');
    return attempt;
  }

  private async ownedSummary(id: string, actor: AuthUser) {
    const attempt = await this.repository.findSummary(id, actor.id);
    if (!attempt) this.notFound();
    if (attempt.purpose !== 'PRACTICE') this.conflict('This attempt belongs to the exam flow.');
    return attempt;
  }

  private testIds(raw: string): string[] {
    const ids = [...new Set(raw.split(',').map(id => id.trim()).filter(Boolean))];
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!ids.length || ids.length > 100 || ids.some(id => !uuid.test(id))) {
      throw new ApplicationError('ATTEMPT_INVALID_TEST_IDS', 'Choose between 1 and 100 valid tests.', 400);
    }
    return ids;
  }

  private assessmentResult(value: AssessmentResult | Record<string, unknown>): AssessmentResult {
    if (!Array.isArray((value as Partial<AssessmentResult>).items)) {
      throw new ApplicationError('PRACTICE_RESULT_INVALID', 'The saved practice result is invalid.', 500);
    }
    return value as AssessmentResult;
  }

  private notFound(): never { throw new ApplicationError('PRACTICE_ATTEMPT_NOT_FOUND', 'Practice attempt not found.', 404); }
  private conflict(message: string): never { throw new ApplicationError('PRACTICE_ATTEMPT_CONFLICT', message, 409); }
}
