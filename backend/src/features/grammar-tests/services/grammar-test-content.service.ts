import { Injectable } from '@nestjs/common';
import { FilterXSS } from 'xss';
import { ApplicationError } from '../../../common/errors/application.error';
import {
  GrammarCover,
  GrammarQuestion,
  GrammarTestAggregate,
  VocabularySet,
} from '../types/grammar-test.type';

const LETTERS = 'ABCDEFGHIJ'.split('');
const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li'];
const richTextFilter = new FilterXSS({
  whiteList: Object.fromEntries(ALLOWED_TAGS.map(tag => [tag, []])),
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object'],
});
const plainTextFilter = new FilterXSS({
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object'],
});

@Injectable()
export class GrammarTestContentService {
  normalize(input: Pick<GrammarTestAggregate, 'mode' | 'details' | 'parts'>): GrammarTestAggregate {
    const mode = input.mode;
    const parts: GrammarTestAggregate['parts'] = {};
    if (mode === 'part1' || mode === 'full') parts[1] = this.normalizePart1(input.parts?.[1]);
    if (mode === 'part2' || mode === 'full') parts[2] = this.normalizePart2(input.parts?.[2]);
    const title = this.plain(input.details?.title ?? '');
    const cover = this.normalizeCover(input.details?.cover, input.details?.pictureUrl);
    return {
      mode,
      details: { title, pictureUrl: cover?.url ?? '', cover },
      parts,
    };
  }

  assertDraftShape(test: GrammarTestAggregate): void {
    if (!['part1', 'part2', 'full'].includes(test.mode)) this.invalid('Select a valid test mode.');
    if (test.details.title.length > 120) this.invalid('Test title cannot exceed 120 characters.');
    if (test.mode === 'part1' || test.mode === 'full') {
      if (test.parts[1]?.questions.length !== 25) this.invalid('Part 1 must contain exactly 25 questions.');
      for (const [index, question] of (test.parts[1]?.questions ?? []).entries()) {
        if (this.plain(question.text).length > 500) this.invalid(`Question ${index + 1}: content cannot exceed 500 characters.`);
        if (question.options.some(option => option.length > 300)) this.invalid(`Question ${index + 1}: answer options cannot exceed 300 characters.`);
        this.assertExplanation(question.explanation, `Question ${index + 1}`);
      }
    }
    if (test.mode === 'part2' || test.mode === 'full') {
      if (test.parts[2]?.sets.length !== 5) this.invalid('Part 2 must contain exactly 5 vocabulary sets.');
      for (const set of test.parts[2]?.sets ?? []) {
        if (set.targetWords.length !== 5 || set.options.length !== 10) {
          this.invalid('Each vocabulary set must contain 5 target words and 10 answer options.');
        }
        if (this.plain(set.instruction).length > 600) this.invalid(`Set ${set.setId}: instruction cannot exceed 600 characters.`);
        if (set.targetWords.some(target => target.word.length > 100)) this.invalid(`Set ${set.setId}: target words cannot exceed 100 characters.`);
        if (set.options.some(option => option.text.length > 100)) this.invalid(`Set ${set.setId}: answer options cannot exceed 100 characters.`);
        set.targetWords.forEach(target => this.assertExplanation(target.explanation, `Set ${set.setId}`));
      }
    }
  }

  assertPublishable(test: GrammarTestAggregate): void {
    this.assertDraftShape(test);
    if (test.details.title.length < 3) this.invalid('Test title must contain at least 3 characters.');
    if (test.parts[1]) this.assertPart1Complete(test.parts[1].questions);
    if (test.parts[2]) this.assertPart2Complete(test.parts[2].sets);
  }

  learnerSafe(test: GrammarTestAggregate): unknown {
    return {
      ...test,
      parts: {
        ...(test.parts[1] ? {
          1: {
            instruction: test.parts[1].instruction,
            questions: test.parts[1].questions.map(question => ({ id: question.id, text: question.text, options: question.options })),
          },
        } : {}),
        ...(test.parts[2] ? {
          2: {
            sets: test.parts[2].sets.map(set => ({
              ...set,
              targetWords: set.targetWords.map(target => ({ id: target.id, word: target.word })),
            })),
          },
        } : {}),
      },
    };
  }

  private normalizePart1(part?: GrammarTestAggregate['parts'][1]): NonNullable<GrammarTestAggregate['parts'][1]> {
    const questions = Array.isArray(part?.questions) ? part.questions.slice(0, 25) : [];
    return {
      instruction: this.rich(part?.instruction ?? ''),
      questions: questions.map((question, index) => ({
        id: index + 1,
        text: this.rich(question?.text ?? ''),
        options: Array.isArray(question?.options)
          ? question.options.slice(0, 3).map(option => this.plain(option))
          : [],
        correctAnswer: Number.isInteger(question?.correctAnswer) ? question.correctAnswer : -1,
        ...(this.rich(question?.explanation ?? '') ? { explanation: this.rich(question?.explanation ?? '') } : {}),
      })),
    };
  }

  private normalizePart2(part?: GrammarTestAggregate['parts'][2]): NonNullable<GrammarTestAggregate['parts'][2]> {
    const sets = Array.isArray(part?.sets) ? part.sets.slice(0, 5) : [];
    return {
      sets: sets.map((set, setIndex) => ({
        setId: setIndex + 1,
        instruction: this.rich(set?.instruction ?? ''),
        targetWords: (Array.isArray(set?.targetWords) ? set.targetWords.slice(0, 5) : []).map((target, targetIndex) => ({
          id: 26 + setIndex * 5 + targetIndex,
          word: this.plain(target?.word ?? ''),
          correctAnswer: this.plain(target?.correctAnswer ?? '').toUpperCase(),
          ...(this.rich(target?.explanation ?? '') ? { explanation: this.rich(target?.explanation ?? '') } : {}),
        })),
        options: (Array.isArray(set?.options) ? set.options.slice(0, 10) : []).map((option, optionIndex) => ({
          label: LETTERS[optionIndex],
          text: this.plain(option?.text ?? ''),
        })),
      })),
    };
  }

  private assertPart1Complete(questions: GrammarQuestion[]): void {
    const questionTexts = new Set<string>();
    questions.forEach((question, index) => {
      const label = `Question ${index + 1}`;
      const text = this.plain(question.text);
      if (!text) this.invalid(`${label}: question content is required.`);
      if (text.length > 500) this.invalid(`${label}: content cannot exceed 500 characters.`);
      const normalizedQuestion = text.toLocaleLowerCase();
      if (questionTexts.has(normalizedQuestion)) this.invalid('Part 1 cannot contain duplicate question content.');
      questionTexts.add(normalizedQuestion);
      if (question.options.length !== 3 || question.options.some(option => !option)) this.invalid(`${label}: three answer options are required.`);
      if (new Set(question.options.map(option => option.toLocaleLowerCase())).size !== 3) this.invalid(`${label}: answer options must be different.`);
      if (!Number.isInteger(question.correctAnswer) || question.correctAnswer < 0 || question.correctAnswer > 2) this.invalid(`${label}: select one valid correct answer.`);
      this.assertExplanation(question.explanation, label);
    });
  }

  private assertPart2Complete(sets: VocabularySet[]): void {
    const globalTargets = new Set<string>();
    sets.forEach((set, setIndex) => {
      const label = `Set ${setIndex + 1}`;
      if (!this.plain(set.instruction)) this.invalid(`${label}: instruction is required.`);
      const optionTexts = set.options.map(option => option.text.toLocaleLowerCase());
      if (set.options.some((option, index) => option.label !== LETTERS[index] || !option.text)) this.invalid(`${label}: complete answer options A–J.`);
      if (new Set(optionTexts).size !== 10) this.invalid(`${label}: answer-bank words must be different.`);
      const usedAnswers = new Set<string>();
      set.targetWords.forEach((target, targetIndex) => {
        const targetLabel = `${label}, target ${targetIndex + 1}`;
        const word = target.word.toLocaleLowerCase();
        if (!word) this.invalid(`${targetLabel}: word is required.`);
        if (globalTargets.has(word)) this.invalid('Part 2 cannot reuse the same target word in different sets.');
        globalTargets.add(word);
        if (!LETTERS.includes(target.correctAnswer)) this.invalid(`${targetLabel}: select a valid answer from this set.`);
        if (usedAnswers.has(target.correctAnswer)) this.invalid(`${label}: each target word must use a different correct answer.`);
        usedAnswers.add(target.correctAnswer);
        this.assertExplanation(target.explanation, targetLabel);
      });
    });
  }

  private assertExplanation(value: string | undefined, label: string): void {
    if (!value) return;
    const plain = this.plain(value);
    if (plain.length > 12_000 || plain.split(/\s+/).filter(Boolean).length > 300) {
      this.invalid(`${label}: explanation cannot exceed 300 words.`);
    }
  }

  private normalizeCover(cover?: GrammarCover | null, pictureUrl?: string): GrammarCover | null {
    const raw = cover?.url ?? pictureUrl ?? '';
    if (!raw) return null;
    let url: URL;
    try { url = new URL(raw); } catch { this.invalid('Upload the test cover before saving.'); }
    if (url.protocol !== 'https:' || !url.hostname.endsWith('res.cloudinary.com')) {
      this.invalid('Test covers must be uploaded to Cloudinary.');
    }
    return {
      url: url.toString(),
      ...(cover?.publicId ? { publicId: cover.publicId.slice(0, 255) } : {}),
      ...(cover?.width ? { width: cover.width } : {}),
      ...(cover?.height ? { height: cover.height } : {}),
      ...(cover?.bytes ? { bytes: cover.bytes } : {}),
      ...(cover?.format ? { format: cover.format.slice(0, 20) } : {}),
    };
  }

  private rich(value: unknown): string {
    return richTextFilter.process(String(value ?? '')).trim();
  }

  private plain(value: unknown): string {
    return plainTextFilter.process(String(value ?? '')).replace(/\s+/g, ' ').trim();
  }

  private invalid(message: string): never {
    throw new ApplicationError('GRAMMAR_TEST_INVALID_CONTENT', message, 422);
  }
}
