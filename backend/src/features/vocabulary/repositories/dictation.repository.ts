import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateDictationExerciseDto } from '../dto/create-dictation.dto';

export type DictationExerciseRow = {
  id: string;
  created_by: string;
  folder_id: string;
  title: string;
  transcript: string;
  audio: unknown | null;
  audio_source: string;
  locale: string;
  practice_level: string | null;
  content_version: number;
  status: string;
  created_at: Date;
  updated_at: Date;
};

export type DictationAttemptRow = {
  id: string;
  user_id: string;
  exercise_id: string;
  typed_text: string;
  correct_words: number;
  total_words: number;
  accuracy: number;
  hint_used: boolean;
  playback_rate: number;
  playback_count: number;
  grading_version: string;
  submitted_at: Date;
};

@Injectable()
export class DictationRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findExercises(folderId?: string): Promise<DictationExerciseRow[]> {
    const values: unknown[] = [];
    let folderClause = '';

    if (folderId) {
      values.push(folderId);
      folderClause = `AND folder_id = $${values.length}`;
    }

    return this.dataSource.query<DictationExerciseRow[]>(
      `SELECT id, created_by, folder_id, title, transcript, audio, audio_source, locale,
              practice_level, content_version, status, created_at, updated_at
       FROM dictation_exercises
       WHERE status = 'PUBLISHED' ${folderClause}
       ORDER BY created_at DESC`,
      values,
    );
  }

  async findExerciseById(id: string): Promise<DictationExerciseRow | null> {
    const rows = await this.dataSource.query<DictationExerciseRow[]>(
      `SELECT id, created_by, folder_id, title, transcript, audio, audio_source, locale,
              practice_level, content_version, status, created_at, updated_at
       FROM dictation_exercises
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async createExercise(creatorId: string, dto: CreateDictationExerciseDto): Promise<DictationExerciseRow> {
    const rows = await this.dataSource.query<DictationExerciseRow[]>(
      `INSERT INTO dictation_exercises (
        created_by, folder_id, title, transcript, audio_source, locale, practice_level, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PUBLISHED')
      RETURNING id, created_by, folder_id, title, transcript, audio, audio_source, locale,
                practice_level, content_version, status, created_at, updated_at`,
      [
        creatorId,
        dto.folderId,
        dto.title,
        dto.transcript,
        dto.audioSource,
        dto.locale ?? 'en-US',
        dto.practiceLevel ?? 'INTERMEDIATE',
      ],
    );
    return rows[0];
  }

  async createAttempt(
    userId: string,
    exercise: DictationExerciseRow,
    result: {
      typedText: string;
      correctWords: number;
      totalWords: number;
      accuracy: number;
      hintUsed: boolean;
      playbackRate: number;
      playbackCount: number;
    },
  ): Promise<DictationAttemptRow> {
    const snapshot = {
      id: exercise.id,
      title: exercise.title,
      transcript: exercise.transcript,
      locale: exercise.locale,
    };

    const rows = await this.dataSource.query<DictationAttemptRow[]>(
      `INSERT INTO dictation_attempts (
        user_id, exercise_id, exercise_snapshot, typed_text, correct_words, total_words,
        accuracy, hint_used, playback_rate, playback_count, grading_version, submitted_at
      ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, 'v1.0', now())
      RETURNING id, user_id, exercise_id, typed_text, correct_words, total_words,
                accuracy, hint_used, playback_rate, playback_count, grading_version, submitted_at`,
      [
        userId,
        exercise.id,
        JSON.stringify(snapshot),
        result.typedText,
        result.correctWords,
        result.totalWords,
        result.accuracy,
        result.hintUsed,
        result.playbackRate,
        result.playbackCount,
      ],
    );
    return rows[0];
  }
}
