import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { plainRichText, richTextWordCount, sanitizeRichText } from '../../../common/content/rich-text';
import { CreateWritingTestDto } from '../dto/save-writing-test.dto';
import { WritingTestAggregate, WritingTestMode } from '../types/writing-test.type';

type WritingPartNumber = 1 | 2 | 3 | 4;

@Injectable()
export class WritingTestContentService {
  normalize(input: CreateWritingTestDto): WritingTestAggregate {
    if (!['part1', 'part2', 'part3', 'part4', 'full'].includes(input.mode)) this.invalid('Select a valid Writing test scope.');
    const mode = input.mode;
    const parts: WritingTestAggregate['parts'] = {};
    for (const partNumber of this.partNumbers(mode)) {
      const source = input.parts?.[partNumber];
      if (!source || typeof source !== 'object') this.invalid(`Part ${partNumber} content is required.`);
      if (partNumber === 1) {
        const part = source as NonNullable<WritingTestAggregate['parts'][1]>;
        parts[1] = {
          context: this.rich(part.context),
          questions: this.stringArray(part.questions, 1),
          sampleAnswers: this.stringArray(part.sampleAnswers, 1),
        };
      } else if (partNumber === 2) {
        const part = source as NonNullable<WritingTestAggregate['parts'][2]>;
        parts[2] = { instruction: this.rich(part.instruction), prompt: this.rich(part.prompt), sampleAnswer: this.rich(part.sampleAnswer) };
      } else if (partNumber === 3) {
        const part = source as NonNullable<WritingTestAggregate['parts'][3]>;
        parts[3] = {
          context: this.rich(part.context),
          messages: this.stringArray(part.messages, 3),
          sampleAnswers: this.stringArray(part.sampleAnswers, 3),
        };
      } else {
        const part = source as NonNullable<WritingTestAggregate['parts'][4]>;
        parts[4] = {
          context: this.rich(part.context),
          informalPrompt: this.rich(part.informalPrompt),
          informalSample: this.rich(part.informalSample),
          formalPrompt: this.rich(part.formalPrompt),
          formalSample: this.rich(part.formalSample),
        };
      }
    }
    const title = this.plain(input.details?.title ?? '').trim();
    const pictureUrl = this.normalizeCover(input.details?.pictureUrl ?? '');
    return { mode, details: { title, pictureUrl }, parts };
  }

  assertDraftShape(test: WritingTestAggregate): void {
    if (test.details.title.length > 180) this.invalid('Test title cannot exceed 180 characters.');
    for (const number of this.partNumbers(test.mode)) {
      const part = test.parts[number];
      if (!part) this.invalid(`Part ${number} content is required.`);
      if (number === 1) {
        const value = part as NonNullable<WritingTestAggregate['parts'][1]>;
        this.assertText(value.context, 10_000, 'Part 1 context', 150);
        this.assertArray(value.questions, 5, 'Part 1 questions');
        this.assertArray(value.sampleAnswers, 5, 'Part 1 sample answers');
        value.questions.forEach((item, index) => this.assertText(item, 4_000, `Part 1 question ${index + 1}`, 80));
        value.sampleAnswers.forEach((item, index) => this.assertText(item, 1_000, `Part 1 sample answer ${index + 1}`, 5));
      } else if (number === 2) {
        const value = part as NonNullable<WritingTestAggregate['parts'][2]>;
        this.assertText(value.instruction, 10_000, 'Part 2 instruction', 150);
        this.assertText(value.prompt, 6_000, 'Part 2 prompt', 100);
        this.assertText(value.sampleAnswer, 12_000, 'Part 2 sample answer', 80);
      } else if (number === 3) {
        const value = part as NonNullable<WritingTestAggregate['parts'][3]>;
        this.assertText(value.context, 10_000, 'Part 3 context', 150);
        this.assertArray(value.messages, 3, 'Part 3 prompts');
        this.assertArray(value.sampleAnswers, 3, 'Part 3 sample responses');
        value.messages.forEach((item, index) => this.assertText(item, 6_000, `Part 3 prompt ${index + 1}`, 100));
        value.sampleAnswers.forEach((item, index) => this.assertText(item, 12_000, `Part 3 sample response ${index + 1}`, 80));
      } else {
        const value = part as NonNullable<WritingTestAggregate['parts'][4]>;
        this.assertText(value.context, 10_000, 'Part 4 context', 150);
        this.assertText(value.informalPrompt, 6_000, 'Part 4 informal prompt', 100);
        this.assertText(value.informalSample, 12_000, 'Part 4 informal sample email', 100);
        this.assertText(value.formalPrompt, 6_000, 'Part 4 formal prompt', 180);
        this.assertText(value.formalSample, 20_000, 'Part 4 formal sample email', 220);
      }
    }
  }

  assertPublishable(test: WritingTestAggregate): void {
    this.assertDraftShape(test);
    if (test.details.title.length < 3) this.invalid('Test title must contain at least 3 characters.');
    for (const number of this.partNumbers(test.mode)) {
      const part = test.parts[number];
      if (number === 1) {
        const value = part as NonNullable<WritingTestAggregate['parts'][1]>;
        this.required(value.context, 'Part 1 context');
        value.questions.forEach((item, i) => this.required(item, `Part 1 question ${i + 1}`));
        value.sampleAnswers.forEach((item, i) => this.required(item, `Part 1 sample answer ${i + 1}`));
      } else if (number === 2) {
        const value = part as NonNullable<WritingTestAggregate['parts'][2]>;
        this.required(value.instruction, 'Part 2 instruction'); this.required(value.prompt, 'Part 2 prompt'); this.required(value.sampleAnswer, 'Part 2 sample answer');
      } else if (number === 3) {
        const value = part as NonNullable<WritingTestAggregate['parts'][3]>;
        this.required(value.context, 'Part 3 context');
        value.messages.forEach((item, i) => this.required(item, `Part 3 prompt ${i + 1}`));
        value.sampleAnswers.forEach((item, i) => this.required(item, `Part 3 sample response ${i + 1}`));
      } else {
        const value = part as NonNullable<WritingTestAggregate['parts'][4]>;
        this.required(value.context, 'Part 4 context'); this.required(value.informalPrompt, 'Part 4 informal prompt');
        this.required(value.informalSample, 'Part 4 informal sample email'); this.required(value.formalPrompt, 'Part 4 formal prompt');
        this.required(value.formalSample, 'Part 4 formal sample email');
      }
    }
  }

  learnerSafe(test: WritingTestAggregate): Record<string, unknown> {
    const parts: Record<string, unknown> = {};
    if (test.parts[1]) parts['1'] = { context: test.parts[1].context, questions: test.parts[1].questions };
    if (test.parts[2]) parts['2'] = { instruction: test.parts[2].instruction, prompt: test.parts[2].prompt };
    if (test.parts[3]) parts['3'] = { context: test.parts[3].context, messages: test.parts[3].messages };
    if (test.parts[4]) parts['4'] = {
      context: test.parts[4].context, informalPrompt: test.parts[4].informalPrompt, formalPrompt: test.parts[4].formalPrompt,
    };
    return { id: test.id, mode: test.mode, details: test.details, parts, status: test.status, version: test.version };
  }

  partNumbers(mode: WritingTestMode): WritingPartNumber[] {
    return mode === 'full' ? [1, 2, 3, 4] : [Number(mode.replace('part', '')) as WritingPartNumber];
  }

  private stringArray(value: unknown, partNumber: number): string[] {
    if (!Array.isArray(value)) this.invalid(`Part ${partNumber} content must contain an array.`);
    if (value.some(item => typeof item !== 'string')) this.invalid(`Part ${partNumber} entries must be text.`);
    return value.map(item => this.rich(item));
  }

  private rich(value: unknown): string {
    if (value == null) return '';
    if (typeof value !== 'string') this.invalid('Text content must be a string.');
    return sanitizeRichText(value);
  }

  private plain(value: unknown): string {
    if (value == null) return '';
    if (typeof value !== 'string') this.invalid('Text content must be a string.');
    return plainRichText(value);
  }

  private normalizeCover(value: string): string {
    if (!value) return '';
    if (typeof value !== 'string') this.invalid('Test cover must be an image URL.');
    let url: URL;
    try { url = new URL(value); } catch { this.invalid('Upload the test cover before saving.'); }
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') this.invalid('Test covers must be uploaded to Cloudinary.');
    return url.toString();
  }

  private assertArray(value: unknown[], length: number, label: string): void {
    if (value.length !== length) this.invalid(`${label} must contain exactly ${length} entries.`);
  }

  private assertText(value: string, maxLength: number, label: string, maxWords?: number): void {
    if (value.length > maxLength) this.invalid(`${label} cannot exceed ${maxLength} characters.`);
    if (maxWords && richTextWordCount(value) > maxWords) this.invalid(`${label} cannot exceed ${maxWords} words.`);
  }

  private required(value: string, label: string): void {
    if (!this.plain(value)) this.invalid(`${label} is required.`);
  }

  private invalid(message: string): never {
    throw new ApplicationError('WRITING_TEST_INVALID', message, 400);
  }
}
