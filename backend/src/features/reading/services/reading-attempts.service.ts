import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ReadingAttemptsRepository, TestAttemptRow } from '../repositories/reading-attempts.repository';
import { ReadingTestsRepository } from '../repositories/reading-tests.repository';
import { ReadingGraderService, QuestionAnswerPair } from './reading-grader.service';
import { SaveProgressDto } from '../dto/save-progress.dto';
import { SubmitAttemptDto } from '../dto/submit-attempt.dto';

@Injectable()
export class ReadingAttemptsService {
  constructor(
    private readonly attemptsRepo: ReadingAttemptsRepository,
    private readonly testsRepo: ReadingTestsRepository,
    private readonly graderService: ReadingGraderService,
  ) {}

  async startAttempt(studentId: string, testId: string): Promise<TestAttemptRow> {
    const test = await this.testsRepo.findTestById(testId);
    if (!test) throw new NotFoundException('Reading test not found');
    if (test.status !== 'PUBLISHED' || !test.published_snapshot_id) {
      throw new BadRequestException('Test is not published yet');
    }

    return this.attemptsRepo.createAttempt(
      studentId,
      test.published_snapshot_id,
      test.scope,
      test.part_number ?? undefined,
    );
  }

  async saveProgress(attemptId: string, studentId: string, dto: SaveProgressDto) {
    const attempt = await this.attemptsRepo.findAttemptById(attemptId);
    if (!attempt || attempt.student_id !== studentId) {
      throw new NotFoundException('Test attempt not found');
    }
    if (attempt.status === 'SUBMITTED') {
      throw new BadRequestException('Attempt has already been submitted');
    }

    return this.attemptsRepo.saveProgress(attemptId, dto.answers, dto.progress);
  }

  async submitAttempt(attemptId: string, studentId: string, dto: SubmitAttemptDto): Promise<TestAttemptRow> {
    const attempt = await this.attemptsRepo.findAttemptById(attemptId);
    if (!attempt || attempt.student_id !== studentId) {
      throw new NotFoundException('Test attempt not found');
    }
    if (attempt.status === 'SUBMITTED') {
      throw new BadRequestException('Attempt has already been submitted');
    }

    // 1. Get saved progress if answers not passed in submit DTO
    let submittedAnswers = dto.answers;
    if (!submittedAnswers) {
      const progress = await this.attemptsRepo.findProgress(attemptId);
      submittedAnswers = progress?.answers ?? {};
    }

    // 2. Load questions from snapshot / test
    const questions = await this.testsRepo.findQuestionsByTestId(attempt.snapshot_id);

    // 3. Build Question-Answer pairs
    const pairs: QuestionAnswerPair[] = questions.map(q => ({
      questionId: q.id,
      partNumber: q.part_number,
      questionType: q.question_type,
      correctAnswer: q.correct_answer,
      userAnswer: (submittedAnswers as Record<string, unknown>)[q.id],
    }));

    // 4. Grade attempt
    const gradingSummary = this.graderService.grade(pairs);

    // 5. Submit & update database
    return this.attemptsRepo.submitAttempt(attemptId, gradingSummary);
  }

  async getAttemptResult(attemptId: string, studentId: string): Promise<TestAttemptRow> {
    const attempt = await this.attemptsRepo.findAttemptById(attemptId);
    if (!attempt || attempt.student_id !== studentId) {
      throw new NotFoundException('Test attempt not found');
    }
    return attempt;
  }
}
