import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TestAttemptsService } from '../test-attempts/services/test-attempts.service';
import { PracticeAttemptsService } from '../test-attempts/services/practice-attempts.service';
import { AuthUser } from '../auth/types/auth-user.type';
import { chatError } from './chatbot.repository';

import { learningStats } from '../ai-shared/learning-statistics';
import { LearningAttempt } from '../ai-shared/learning-statistics.types';

@Injectable()
export class ChatbotContext {
  constructor(
    private readonly db: DataSource,
    private readonly exams: TestAttemptsService,
    private readonly practice: PracticeAttemptsService,
  ) {}
  async review(actor: AuthUser, attemptId: string, questionKey?: string) {
    const [a] = await this.db.query(
      `SELECT id,purpose,part_number,assessment_revision,status FROM test_attempts WHERE id=$1 AND student_id=$2`,
      [attemptId, actor.id],
    );
    if (!a || a.status !== 'SUBMITTED')
      throw chatError('CHAT_RESULT_UNAVAILABLE', 404);
    const service = a.purpose === 'PRACTICE' ? this.practice : this.exams;
    const summary: any = await service.result(attemptId, actor);
    const part = questionKey
      ? Number(/^p([1-4]):q\d{1,3}$/.exec(questionKey)?.[1])
      : a.part_number;
    if (questionKey && !part) throw chatError('CHAT_CONTEXT_INVALID', 400);
    const detail: any = part
      ? await service.details(attemptId, part, actor)
      : null;
    if (questionKey && !detail.items.some((i: any) => i.key === questionKey))
      throw chatError('CHAT_CONTEXT_INVALID', 400);
    // Allow-list result fields; audio URLs and account information are never sent to the provider.
    const data = {
      attemptId,
      questionKey: questionKey ?? null,
      assessmentRevision: a.assessment_revision,
      title: summary.title,
      component: summary.component,
      purpose: a.purpose,
      scope: summary.scope,
      gradingStatus: summary.gradingStatus,
      score: summary.score,
      maxScore: summary.maxScore,
      estimatedCefr: summary.estimatedCefr,
      parts: summary.result?.parts,
      writing: summary.result?.writing,
      speaking: summary.result?.speaking
        ? {
            provider: summary.result.speaking.provider,
            criteria: summary.result.speaking.criteria,
            cefrReason: summary.result.speaking.cefrReason,
            partFeedback: summary.result.speaking.partFeedback,
          }
        : null,
      detail: detail
        ? {
            partNumber: part,
            paper: detail.paper,
            items: detail.items.filter(
              (i: any) => !questionKey || i.key === questionKey,
            ),
            writing: detail.writing,
          }
        : null,
    };
    return redactMedia(data);
  }
  async stats(actor: AuthUser) {
    const rows = await this.db.query<LearningAttempt[]>(
      `SELECT id,component,purpose,scope,part_number,score,max_score,submitted_at,result FROM test_attempts
      WHERE student_id=$1 AND status='SUBMITTED' ORDER BY submitted_at DESC,id DESC LIMIT 20`,
      [actor.id],
    );
    return learningStats(
      rows,
      'Chỉ mô tả tối đa 20 bài đã nộp gần nhất; không gộp điểm khác kỹ năng/chế độ/phạm vi hoặc suy CEFR tổng thể.',
    );
  }
}
function redactMedia(value: any): any {
  if (Array.isArray(value)) return value.map(redactMedia);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => !/audio|image|url|media|avatar|email/i.test(k))
        .map(([k, v]) => [k, redactMedia(v)]),
    );
  return value;
}
