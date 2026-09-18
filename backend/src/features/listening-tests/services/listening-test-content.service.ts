import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { ListeningTestAggregate } from '../types/listening-test.type';
import { CreateListeningTestDto, UpdateListeningTestDto } from '../dto/save-listening-test.dto';

@Injectable()
export class ListeningTestContentService {
  normalize(dto: CreateListeningTestDto | UpdateListeningTestDto): ListeningTestAggregate {
    return {
      mode: dto.mode,
      details: {
        title: dto.details?.title?.trim() || 'Untitled Listening Test',
        pictureUrl: dto.details?.pictureUrl || undefined,
      },
      parts: dto.parts || {},
    };
  }

  assertDraftShape(aggregate: ListeningTestAggregate): void {
    if (!aggregate.details.title) {
      throw new ApplicationError('LISTENING_TITLE_REQUIRED', 'Test title is required.', 400);
    }
    // Thực thi validation khắt khe (bao gồm cả Audio) ngay từ lúc tạo/lưu draft
    this.assertPublishable(aggregate);
  }

  assertPublishable(aggregate: ListeningTestAggregate): void {
    const { mode, parts } = aggregate;

    if (mode === 'full' || mode === 'part1') {
      const p1 = parts[1];
      if (!p1 || !Array.isArray(p1.questions) || p1.questions.length < 13) {
        throw new ApplicationError('LISTENING_PART1_INVALID', 'Part 1 must have at least 13 questions.', 400);
      }
      if (p1.questions.some(q => !q.text || !q.audioUrl)) {
        throw new ApplicationError('LISTENING_PART1_INCOMPLETE', 'All questions in Part 1 must have text and audio.', 400);
      }
    }

    if (mode === 'full' || mode === 'part2') {
      const p2 = parts[2];
      if (!p2 || !p2.audioUrl || !Array.isArray(p2.speakers) || p2.speakers.length < 4 || !Array.isArray(p2.options) || p2.options.length < 5) {
        throw new ApplicationError('LISTENING_PART2_INVALID', 'Part 2 requires audio, 4 speakers, and 5 options.', 400);
      }
    }

    if (mode === 'full' || mode === 'part3') {
      const p3 = parts[3];
      if (!p3 || !p3.audioUrl || !Array.isArray(p3.statements) || p3.statements.length < 4) {
        throw new ApplicationError('LISTENING_PART3_INVALID', 'Part 3 requires audio and 4 statements.', 400);
      }
    }

    if (mode === 'full' || mode === 'part4') {
      const p4 = parts[4];
      if (!p4 || !Array.isArray(p4.recordings) || p4.recordings.length < 2) {
        throw new ApplicationError('LISTENING_PART4_INVALID', 'Part 4 requires 2 recordings.', 400);
      }
      for (const rec of p4.recordings) {
        if (!rec.audioUrl || !Array.isArray(rec.subQuestions) || rec.subQuestions.length < 2) {
          throw new ApplicationError('LISTENING_PART4_INCOMPLETE', 'Each recording in Part 4 must have audio and 2 questions.', 400);
        }
      }
    }
  }

  learnerSafe(aggregate: ListeningTestAggregate): ListeningTestAggregate {
    const safe: ListeningTestAggregate = JSON.parse(JSON.stringify(aggregate));

    if (safe.parts[1]) {
      safe.parts[1].questions.forEach(q => {
        (q as any).correctAnswer = undefined;
      });
    }

    if (safe.parts[2]) {
      (safe.parts[2] as any).answers = undefined;
    }

    if (safe.parts[3]) {
      safe.parts[3].statements.forEach(s => {
        (s as any).answer = undefined;
      });
    }

    if (safe.parts[4]) {
      safe.parts[4].recordings.forEach(rec => {
        rec.subQuestions.forEach(q => {
          (q as any).correctAnswer = undefined;
        });
      });
    }

    return safe;
  }
}
