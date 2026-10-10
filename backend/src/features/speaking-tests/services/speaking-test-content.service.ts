import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { CreateSpeakingTestDto } from '../dto/save-speaking-test.dto';
import { SpeakingTestAggregate } from '../types/speaking-test.type';
import { defaultTestPurpose } from '../../../common/tests/test-purpose';
import { assertDraftCollection, assertDraftParts } from '../../../common/tests/draft-shape';

@Injectable()
export class SpeakingTestContentService {
  normalize(dto: CreateSpeakingTestDto): SpeakingTestAggregate {
    return {
      mode: dto.mode,
      purpose: dto.purpose ?? defaultTestPurpose(dto.mode),
      details: { title: dto.details?.title?.trim() || 'Untitled Speaking Test', pictureUrl: dto.details?.pictureUrl },
      parts: dto.parts || {},
    };
  }

  assertDraftShape(aggregate: SpeakingTestAggregate): void {
    if (aggregate.purpose === 'EXAM' && aggregate.mode !== 'full') {
      throw new ApplicationError('SPEAKING_EXAM_SCOPE_INVALID', 'Exam tests must contain the full skill.', 400);
    }
    if (!aggregate.details?.title?.trim()) {
      throw new ApplicationError('VALIDATION_FAILED', 'Title is required for draft', 400);
    }
    assertDraftParts(aggregate.parts);
    for (const [number, part] of Object.entries(aggregate.parts)) {
      assertDraftCollection(part.questions, 3, `Speaking Part ${number} questions`);
      for (const question of part.questions) this.assertGuidance(question.sampleAnswer, question.explanation, `Speaking Part ${number}`);
    }
    const p3 = aggregate.parts[3];
    if (p3) assertDraftCollection(p3.imageUrls, 2, 'Speaking Part 3 images', false);
    const p4 = aggregate.parts[4];
    if (p4) this.assertGuidance(p4.sampleAnswer, p4.explanation, 'Speaking Part 4');
  }

  assertPublishable(aggregate: SpeakingTestAggregate): void {
    const mode = aggregate.mode;
    
    if (mode === 'full' || mode === 'part1') {
      const p1 = aggregate.parts[1];
      if (!p1?.questions || p1.questions.length !== 3) {
        throw new ApplicationError('VALIDATION_FAILED', 'Part 1 must have exactly 3 questions', 400);
      }
      p1.questions.forEach((q, idx) => {
        if (!q.text?.trim()) throw new ApplicationError('VALIDATION_FAILED', `Part 1 Question ${idx + 1} text is required`, 400);
        this.assertGuidance(q.sampleAnswer, q.explanation, `Part 1 Question ${idx + 1}`);
      });
    }

    if (mode === 'full' || mode === 'part2') {
      const p2 = aggregate.parts[2];
      if (!p2?.imageUrl?.trim()) throw new ApplicationError('VALIDATION_FAILED', 'Part 2 requires an image URL', 400);
      if (!p2?.questions || p2.questions.length !== 3) {
        throw new ApplicationError('VALIDATION_FAILED', 'Part 2 must have exactly 3 questions', 400);
      }
      p2.questions.forEach((q, idx) => {
        if (!q.text?.trim()) throw new ApplicationError('VALIDATION_FAILED', `Part 2 Question ${idx + 1} text is required`, 400);
        this.assertGuidance(q.sampleAnswer, q.explanation, `Part 2 Question ${idx + 1}`);
      });
    }

    if (mode === 'full' || mode === 'part3') {
      const p3 = aggregate.parts[3];
      if (!p3?.imageUrls || p3.imageUrls.length !== 2) throw new ApplicationError('VALIDATION_FAILED', 'Part 3 requires exactly 2 image URLs', 400);
      if (!p3?.questions || p3.questions.length !== 3) {
        throw new ApplicationError('VALIDATION_FAILED', 'Part 3 must have exactly 3 questions', 400);
      }
      p3.questions.forEach((q, idx) => {
        if (!q.text?.trim()) throw new ApplicationError('VALIDATION_FAILED', `Part 3 Question ${idx + 1} text is required`, 400);
        this.assertGuidance(q.sampleAnswer, q.explanation, `Part 3 Question ${idx + 1}`);
      });
    }

    if (mode === 'full' || mode === 'part4') {
      const p4 = aggregate.parts[4];
      if (!p4?.topic?.trim()) throw new ApplicationError('VALIDATION_FAILED', 'Part 4 requires a topic', 400);
      if (!p4?.imageUrl?.trim()) throw new ApplicationError('VALIDATION_FAILED', 'Part 4 requires an image URL', 400);
      if (!p4?.questions || p4.questions.length !== 3) {
        throw new ApplicationError('VALIDATION_FAILED', 'Part 4 must have exactly 3 questions', 400);
      }
      p4.questions.forEach((q, idx) => {
        if (!q.text?.trim()) throw new ApplicationError('VALIDATION_FAILED', `Part 4 Question ${idx + 1} text is required`, 400);
      });
      this.assertGuidance(p4.sampleAnswer, p4.explanation, 'Part 4');
    }
  }

  learnerSafe(aggregate: SpeakingTestAggregate): SpeakingTestAggregate {
    const clone = structuredClone(aggregate);
    for (const number of [1, 2, 3] as const) {
      const part = clone.parts[number];
      if (part) part.questions = part.questions.map(question => ({ ...question, sampleAnswer: undefined, explanation: undefined }));
    }
    if (clone.parts[4]) {
      clone.parts[4].sampleAnswer = undefined;
      clone.parts[4].explanation = undefined;
    }
    return clone;
  }

  private assertGuidance(sampleAnswer: string | undefined, explanation: string | undefined, label: string): void {
    if ((sampleAnswer?.length ?? 0) > 10_000) {
      throw new ApplicationError('VALIDATION_FAILED', `${label} sample answer is too long`, 400);
    }
    if ((explanation?.length ?? 0) > 5_000) {
      throw new ApplicationError('VALIDATION_FAILED', `${label} explanation is too long`, 400);
    }
  }
}
