import { Injectable, NotFoundException } from '@nestjs/common';
import { DictationRepository, DictationExerciseRow, DictationAttemptRow } from '../repositories/dictation.repository';
import { CreateDictationExerciseDto } from '../dto/create-dictation.dto';
import { SubmitDictationAttemptDto } from '../dto/submit-dictation.dto';

@Injectable()
export class DictationService {
  constructor(private readonly dictationRepo: DictationRepository) {}

  async listExercises(folderId?: string): Promise<DictationExerciseRow[]> {
    return this.dictationRepo.findExercises(folderId);
  }

  async getExercise(id: string): Promise<DictationExerciseRow> {
    const exercise = await this.dictationRepo.findExerciseById(id);
    if (!exercise) throw new NotFoundException('Dictation exercise not found');
    return exercise;
  }

  async createExercise(creatorId: string, dto: CreateDictationExerciseDto): Promise<DictationExerciseRow> {
    return this.dictationRepo.createExercise(creatorId, dto);
  }

  async submitAttempt(userId: string, dto: SubmitDictationAttemptDto): Promise<{ data: DictationAttemptRow; feedback: { wordResults: Array<{ target: string; typed?: string; isCorrect: boolean }> } }> {
    const exercise = await this.dictationRepo.findExerciseById(dto.exerciseId);
    if (!exercise) throw new NotFoundException('Dictation exercise not found');

    const targetWords = this.tokenize(exercise.transcript);
    const typedWords = this.tokenize(dto.typedText);

    let correctCount = 0;
    const wordResults: Array<{ target: string; typed?: string; isCorrect: boolean }> = [];

    const totalWords = targetWords.length > 0 ? targetWords.length : 1;

    for (let i = 0; i < totalWords; i++) {
      const target = targetWords[i] ?? '';
      const typed = typedWords[i] ?? '';
      const isCorrect = target.toLowerCase() === typed.toLowerCase();

      if (isCorrect) correctCount++;

      wordResults.push({
        target,
        typed: typed || undefined,
        isCorrect,
      });
    }

    const accuracy = Number(((correctCount / totalWords) * 100).toFixed(2));

    const attempt = await this.dictationRepo.createAttempt(userId, exercise, {
      typedText: dto.typedText,
      correctWords: correctCount,
      totalWords,
      accuracy,
      hintUsed: dto.hintUsed ?? false,
      playbackRate: dto.playbackRate ?? 1.0,
      playbackCount: dto.playbackCount ?? 1,
    });

    return {
      data: attempt,
      feedback: {
        wordResults,
      },
    };
  }

  private tokenize(text: string): string[] {
    return text
      .trim()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '')
      .split(/\s+/)
      .filter(w => w.length > 0);
  }
}
