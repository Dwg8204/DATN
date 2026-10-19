import { DataSource } from 'typeorm';
import { AuthUser } from '../../auth/types/auth-user.type';
import { ChatbotContext } from '../../chatbot/chatbot.context';
import { AssessmentPaperFactory } from '../assessments/assessment-paper.factory';
import { ObjectiveGraderService } from '../assessments/objective-grader.service';
import { SPEAKING_PART_NOTICE } from '../assessments/speaking-result-policy';
import { TestAttemptsRepository } from '../repositories/test-attempts.repository';
import { AssessmentResult, AttemptRow } from '../types/attempt.type';
import { PracticeAttemptsService } from './practice-attempts.service';
import { TestAttemptsService } from './test-attempts.service';

const actor = { id: 'learner' } as AuthUser;

describe('Speaking CEFR result boundaries', () => {
  it.each(['EXAM', 'PRACTICE'] as const)(
    '%s protects legacy Part reads and chatbot context without changing full results',
    async (purpose) => {
      const result: AssessmentResult = {
        schemaVersion: 1,
        method: 'AI',
        score: 37.5,
        maxScore: 50,
        counts: { correct: 0, incorrect: 0, skipped: 0 },
        parts: [],
        items: [],
        gradingNotice: 'Legacy B2 estimate',
        speaking: {
          provider: 'LLM',
          version: 'speaking-rubric-v4',
          assessedAt: '2026-10-01T00:00:00Z',
          criteria: {
            grammarVocabulary: 75,
            pronunciation: 75,
            fluency: 75,
            taskFulfillment: 75,
          },
          averagePercentage: 75,
          estimatedCefr: 'B2',
          cefrReason: 'Legacy B2 rationale',
        },
      };
      const original = JSON.stringify(result);
      const attempt = {
        id: 'attempt',
        component: 'SPEAKING',
        purpose,
        scope: 'PART',
        part_number: 1,
        status: 'SUBMITTED',
        score: '37.5',
        max_score: '50',
        estimated_cefr: 'B2',
        result,
      } as AttemptRow;
      const repository = {
        findSummary: jest.fn(async () => attempt),
        progress: jest.fn(async () => null),
      };
      const dependencies = [
        repository as unknown as TestAttemptsRepository,
        new AssessmentPaperFactory(),
        new ObjectiveGraderService(),
      ] as const;
      const exams = new TestAttemptsService(...dependencies);
      const practice = new PracticeAttemptsService(...dependencies);
      const service = purpose === 'EXAM' ? exams : practice;
      const detail: Awaited<ReturnType<typeof service.details>> = {
        attemptId: attempt.id, component: 'SPEAKING', purpose,
        items: [], paper: {}, partNumber: 1,
      };
      jest.spyOn(service, 'details').mockResolvedValue(detail);
      const query = jest.fn(async () => [attempt]);
      const chatbot = new ChatbotContext(
        { query } as unknown as DataSource,
        exams,
        practice,
      );

      for (const part of [1, 2, 3, 4]) {
        attempt.part_number = part;
        const summary = await service.result(attempt.id, actor);
        expect(summary).toMatchObject({
          estimatedCefr: null,
          score: 37.5,
          maxScore: 50,
          result: {
            gradingNotice: SPEAKING_PART_NOTICE,
            speaking: {
              estimatedCefr: null,
              cefrReason: SPEAKING_PART_NOTICE,
              criteria: result.speaking!.criteria,
            },
          },
        });
        const context = await chatbot.review(actor, attempt.id);
        expect(context.estimatedCefr).toBeNull();
        expect(JSON.stringify(context)).not.toContain('B2');
        expect(JSON.stringify(await chatbot.stats(actor))).not.toContain('B2');
      }
      expect(JSON.stringify(result)).toBe(original);
      expect(repository.findSummary).toHaveBeenCalledWith(attempt.id, actor.id);

      attempt.scope = 'FULL_SKILL';
      attempt.part_number = null;
      expect(await service.result(attempt.id, actor)).toMatchObject({
        estimatedCefr: 'B2',
        result,
      });
      expect((await chatbot.review(actor, attempt.id)).estimatedCefr).toBe(
        'B2',
      );
    },
  );
});
