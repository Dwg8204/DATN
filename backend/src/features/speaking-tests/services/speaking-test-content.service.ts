import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { CreateSpeakingTestDto } from '../dto/save-speaking-test.dto';
import { SpeakingTestAggregate } from '../types/speaking-test.type';

@Injectable()
export class SpeakingTestContentService {
  normalize(dto: CreateSpeakingTestDto): SpeakingTestAggregate {
    return {
      mode: dto.mode,
      details: { title: dto.details?.title?.trim() || 'Untitled Speaking Test', pictureUrl: dto.details?.pictureUrl },
      parts: dto.parts || {},
    };
  }

  assertDraftShape(aggregate: SpeakingTestAggregate): void {
    if (!aggregate.details?.title?.trim()) {
      throw new ApplicationError('VALIDATION_FAILED', 'Title is required for draft', 400);
    }
    this.assertPublishable(aggregate); // Enforce complete structure even for drafts for simplicity
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
    }
  }

  learnerSafe(aggregate: SpeakingTestAggregate): SpeakingTestAggregate {
    // Speaking questions do not contain answers, so we can return it as-is.
    return aggregate;
  }
}
