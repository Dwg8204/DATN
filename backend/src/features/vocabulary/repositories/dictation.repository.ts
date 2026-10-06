import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateDictationExerciseDto } from '../dto/create-dictation.dto';

export type DictationExerciseRow = {
  id: string;
  created_by: string | null;
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

  async findExercises(userId: string, folderId?: string): Promise<DictationExerciseRow[]> {
    const values: unknown[] = [userId];
    let folderClause = '';

    if (folderId) {
      values.push(folderId);
      folderClause = `AND e.folder_id = $${values.length}`;
    }

    return this.dataSource.query<DictationExerciseRow[]>(
      `SELECT e.* FROM dictation_exercises e JOIN vocabulary_folders f ON f.id=e.folder_id
       WHERE e.status='PUBLISHED' AND f.archived_at IS NULL AND (f.owner_id IS NULL OR f.owner_id=$1)
       AND (NOT e.is_personal OR (e.created_by=$1 AND EXISTS (
         SELECT 1 FROM user_notebook_items n WHERE n.user_id=$1 AND n.dictation_exercise_id=e.id
         AND n.archived_at IS NULL AND n.is_saved=true))) ${folderClause}
       ORDER BY e.created_at DESC`,
      values,
    );
  }

  async findExerciseById(id: string, userId: string): Promise<DictationExerciseRow | null> {
    const rows = await this.findExercises(userId);
    return rows.find(row => row.id === id) ?? null;
  }

  async createExercise(creatorId: string, dto: CreateDictationExerciseDto): Promise<DictationExerciseRow> {
    const [folder] = await this.dataSource.query(`SELECT id FROM vocabulary_folders
      WHERE id=$1 AND (owner_id IS NULL OR owner_id=$2) AND archived_at IS NULL`, [dto.folderId, creatorId]);
    if (!folder) throw new NotFoundException('Topic not found.');
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
      clientEventId?: string;
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
        accuracy, hint_used, playback_rate, playback_count, grading_version, submitted_at, client_event_id
      ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, 'v1.0', clock_timestamp(), $11)
      ON CONFLICT (user_id,client_event_id) WHERE client_event_id IS NOT NULL DO NOTHING
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
        result.clientEventId ?? null,
      ],
    );
    if (rows[0]) return rows[0];
    const [previous] = await this.dataSource.query<DictationAttemptRow[]>(
      'SELECT * FROM dictation_attempts WHERE user_id=$1 AND client_event_id=$2', [userId, result.clientEventId]);
    if (!previous || previous.exercise_id !== exercise.id || previous.typed_text !== result.typedText
      || previous.hint_used !== result.hintUsed || Number(previous.playback_rate) !== result.playbackRate
      || previous.playback_count !== result.playbackCount) throw new ConflictException('Submission identifier already used.');
    return previous;
  }
}
