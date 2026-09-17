import { Injectable } from '@nestjs/common';
import { FilterXSS } from 'xss';
import { ApplicationError } from '../../../common/errors/application.error';
import { CreateWritingTestDto } from '../dto/save-writing-test.dto';
import { WritingTestAggregate, WritingTestMode } from '../types/writing-test.type';

const richTextFilter = new FilterXSS({
  whiteList: { p: [], br: [], strong: [], b: [], em: [], i: [], u: [], ul: [], ol: [], li: [] },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object'],
});
const plainTextFilter = new FilterXSS({ whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script', 'style', 'iframe', 'object'] });
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
        this.assertText(value.context, 10_000, 'Part 1 context');
        this.assertArray(value.questions, 5, 'Part 1 questions');
        this.assertArray(value.sampleAnswers, 5, 'Part 1 sample answers');
        value.questions.forEach((item, index) => this.assertText(item, 4_000, `Part 1 question ${index + 1}`));
        value.sampleAnswers.forEach((item, index) => this.assertText(item, 1_000, `Part 1 sample answer ${index + 1}`));
      } else if (number === 2) {
        const value = part as NonNullable<WritingTestAggregate['parts'][2]>;
        this.assertText(value.instruction, 10_000, 'Part 2 instruction');
        this.assertText(value.prompt, 6_000, 'Part 2 prompt');
        this.assertText(value.sampleAnswer, 12_000, 'Part 2 sample answer');
      } else if (number === 3) {
        const value = part as NonNullable<WritingTestAggregate['parts'][3]>;
        this.assertText(value.context, 10_000, 'Part 3 context');
        this.assertArray(value.messages, 3, 'Part 3 prompts');
        this.assertArray(value.sampleAnswers, 3, 'Part 3 sample responses');
        value.messages.forEach((item, index) => this.assertText(item, 6_000, `Part 3 prompt ${index + 1}`));
        value.sampleAnswers.forEach((item, index) => this.assertText(item, 12_000, `Part 3 sample response ${index + 1}`));
      } else {
        const value = part as NonNullable<WritingTestAggregate['parts'][4]>;
        this.assertText(value.context, 10_000, 'Part 4 context');
        this.assertText(value.informalPrompt, 6_000, 'Part 4 informal prompt');
        this.assertText(value.informalSample, 12_000, 'Part 4 informal sample email');
        this.assertText(value.formalPrompt, 6_000, 'Part 4 formal prompt');
        this.assertText(value.formalSample, 20_000, 'Part 4 formal sample email');
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
    return value.map(item => this.rich(item));
  }

  private rich(value: unknown): string {
    if (typeof value !== 'string') return '';
    return richTextFilter.process(value).trim();
  }

  private plain(value: unknown): string {
    return typeof value === 'string' ? plainTextFilter.process(value).trim() : '';
  }

  private normalizeCover(value: string): string {
    if (!value) return '';
    let url: URL;
    try { url = new URL(value); } catch { this.invalid('Upload the test cover before saving.'); }
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') this.invalid('Test covers must be uploaded to Cloudinary.');
    return url.toString();
  }

  private assertArray(value: unknown[], length: number, label: string): void {
    if (value.length !== length) this.invalid(`${label} must contain exactly ${length} entries.`);
  }

  private assertText(value: string, maxLength: number, label: string): void {
    if (value.length > maxLength) this.invalid(`${label} cannot exceed ${maxLength} characters.`);
  }

  private required(value: string, label: string): void {
    if (!this.plain(value)) this.invalid(`${label} is required.`);
  }

  private invalid(message: string): never {
    throw new ApplicationError('WRITING_TEST_INVALID', message, 400);
  }
}
