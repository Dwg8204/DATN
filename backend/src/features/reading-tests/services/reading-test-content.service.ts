import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { defaultTestPurpose } from '../../../common/tests/test-purpose';
import { CreateReadingTestDto } from '../dto/save-reading-test.dto';
import { ReadingTestAggregate } from '../types/reading-test.type';
import { assertDraftCollection, assertDraftParts } from '../../../common/tests/draft-shape';

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
    assertDraftParts(test.parts);
    const p1 = test.parts[1];
    if (p1) {
      assertDraftCollection(p1.questions, 5, 'Reading Part 1 questions');
      for (const question of p1.questions) assertDraftCollection(question.options, 3, 'Reading Part 1 options', false);
    }
    const p2 = test.parts[2];
    if (p2) {
      const texts = Array.isArray(p2.texts) ? p2.texts : [{ sentences: p2.sentences }];
      if (Array.isArray(p2.texts)) assertDraftCollection(texts, 2, 'Reading Part 2 texts');
      for (const text of texts) assertDraftCollection(text.sentences, 6, 'Reading Part 2 sentences');
    }
    const p3 = test.parts[3];
    if (p3) {
      assertDraftCollection(p3.speakers, 4, 'Reading Part 3 speakers', false);
      assertDraftCollection(p3.posts, 4, 'Reading Part 3 posts', false);
      assertDraftCollection(p3.questions, 7, 'Reading Part 3 questions');
    }
    const p4 = test.parts[4];
    if (p4) {
      assertDraftCollection(p4.paragraphs, 7, 'Reading Part 4 paragraphs');
      assertDraftCollection(p4.headings, 7, 'Reading Part 4 headings');
    }
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
        const hasTextCollection = Array.isArray(part.texts);
        const texts = hasTextCollection ? part.texts : [{ id: 'p2-text1', title: part.title, sentences: part.sentences }];
        if (hasTextCollection && texts.length !== 2) this.invalid(2);
        for (const text of texts) {
          const positions = text.sentences?.map((item: any) => item.correctPosition) ?? [];
          if (!text.title?.trim() || text.sentences?.length !== 6 || text.sentences.some((item: any) => !item.content?.trim()) ||
            positions.some((position: unknown) => !Number.isInteger(position) || Number(position) < 1 || Number(position) > 6) ||
            new Set(positions).size !== 6) this.invalid(2);
        }
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
    if (p2) {
      if (Array.isArray(p2.texts)) p2.texts = p2.texts.map((text: any) => ({ ...text,
        sentences: text.sentences.map((sentence: any) => ({ ...sentence, correctPosition: undefined, explanation: undefined })) }));
      else p2.sentences = p2.sentences.map((sentence: any) => ({ ...sentence, correctPosition: undefined, explanation: undefined }));
    }
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
