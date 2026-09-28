import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { defaultTestPurpose } from '../../../common/tests/test-purpose';
import { CreateReadingTestDto } from '../dto/save-reading-test.dto';
import { ReadingTestAggregate } from '../types/reading-test.type';

@Injectable()
export class ReadingTestContentService {
  normalize(dto: CreateReadingTestDto): ReadingTestAggregate {
    return { mode: dto.mode, purpose: dto.purpose ?? defaultTestPurpose(dto.mode),
      details: { title: dto.details?.title?.trim() || 'Untitled Reading Test', pictureUrl: dto.details?.pictureUrl },
      parts: dto.parts ?? {} };
  }

  assertDraftShape(test: ReadingTestAggregate): void {
    if (test.purpose === 'EXAM' && test.mode !== 'full') {
      throw new ApplicationError('READING_EXAM_SCOPE_INVALID', 'Exam tests must contain the full skill.', 400);
    }
    if (!test.details.title.trim()) throw new ApplicationError('VALIDATION_FAILED', 'Title is required.', 400);
    this.assertPublishable(test);
  }

  assertPublishable(test: ReadingTestAggregate): void {
    const required = test.mode === 'full' ? [1, 2, 3, 4] : [Number(test.mode.slice(4))];
    for (const number of required) {
      const part = test.parts[String(number)] ?? test.parts[number];
      if (!part) throw new ApplicationError('VALIDATION_FAILED', `Part ${number} is required.`, 400);
      if (number === 1) {
        if (!(part.passageHtml || part.passage)?.trim() || part.questions?.length !== 5) this.invalid(1);
        const source = String(part.passageHtml || part.passage);
        for (let gap = 1; gap <= 5; gap += 1) {
          const htmlMatches = source.match(new RegExp(`data-gap=["']${gap}["']`, 'g'))?.length ?? 0;
          const legacyMatches = source.match(new RegExp(`\\[${gap}\\]`, 'g'))?.length ?? 0;
          if (htmlMatches + legacyMatches !== 1) this.invalid(1);
        }
        for (const question of part.questions) {
          const options = question.options?.map((option: string) => option.trim()) ?? [];
          if (options.length !== 3 || options.some((option: string) => !option) || new Set(options.map((option: string) => option.toLowerCase())).size !== 3 ||
            !options.includes(question.answer?.trim())) this.invalid(1);
        }
      }
      if (number === 2) {
        const positions = part.sentences?.map((item: any) => item.correctPosition) ?? [];
        if (!part.title?.trim() || part.sentences?.length !== 6 || part.sentences.some((item: any) => !item.content?.trim()) ||
          positions.some((position: unknown) => !Number.isInteger(position) || Number(position) < 1 || Number(position) > 6) ||
          new Set(positions).size !== 6) this.invalid(2);
      }
      if (number === 3 && (part.speakers?.length !== 4 || part.posts?.length !== 4 || part.questions?.length !== 7 ||
        part.speakers.some((value: string) => !value.trim()) || new Set(part.speakers.map((value: string) => value.trim().toLowerCase())).size !== 4 ||
        part.posts.some((value: string) => !value.trim()) ||
        part.questions.some((item: any) => !item.statement?.trim() || !part.speakers.includes(item.answer)))) this.invalid(3);
      if (number === 4) {
        const paragraphIds = new Set((part.paragraphs ?? []).map((item: any) => item.id));
        const matches = (part.headings ?? []).map((item: any) => item.correctParagraph);
        if (!part.title?.trim() || part.paragraphs?.length !== 7 || part.headings?.length !== 7 ||
          part.paragraphs.some((item: any) => !item.id || !item.content?.trim()) || paragraphIds.size !== 7 ||
          part.headings.some((item: any) => !item.text?.trim() || !paragraphIds.has(item.correctParagraph)) ||
          new Set(matches).size !== 7) this.invalid(4);
      }
    }
  }

  learnerSafe(test: ReadingTestAggregate): ReadingTestAggregate {
    const clone = structuredClone(test);
    const p1 = clone.parts['1'];
    if (p1) p1.questions = p1.questions.map((question: any) => ({ ...question, answer: undefined, explanation: undefined }));
    const p2 = clone.parts['2'];
    if (p2) p2.sentences = p2.sentences.map((sentence: any) => ({ ...sentence, correctPosition: undefined, explanation: undefined }));
    const p3 = clone.parts['3'];
    if (p3) p3.questions = p3.questions.map((question: any) => ({ ...question, answer: undefined, explanation: undefined }));
    const p4 = clone.parts['4'];
    if (p4) p4.headings = p4.headings.map((heading: any) => ({ ...heading, correctParagraph: undefined, explanation: undefined }));
    return clone;
  }

  private invalid(part: number): never {
    throw new ApplicationError('VALIDATION_FAILED', `Reading Part ${part} is incomplete.`, 400);
  }
}
