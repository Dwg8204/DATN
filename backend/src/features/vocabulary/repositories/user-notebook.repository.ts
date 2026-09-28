import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SaveNotebookItemDto } from '../dto/save-notebook-item.dto';
import { FlashcardReviewDto } from '../dto/flashcard-review.dto';

export type UserNotebookItemRow = {
  id: string;
  user_id: string;
  folder_id: string;
  folder_name: string;
  item_type: string;
  vocabulary_entry_id: string | null;
  term: string | null;
  meaning: string | null;
  phonetic: string | null;
  part_of_speech: string | null;
  context_sentence: string | null;
  user_example: string | null;
  user_notes: string | null;
  last_rating: string | null;
  last_reviewed_at: Date | null;
  review_count: number;
  saved_at: Date;
};

@Injectable()
export class UserNotebookRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findUserNotebook(userId: string, folderId?: string): Promise<UserNotebookItemRow[]> {
    const values: unknown[] = [userId];
    let folderClause = '';

    if (folderId) {
      values.push(folderId);
      folderClause = `AND n.folder_id = $${values.length}`;
    }

    return this.dataSource.query<UserNotebookItemRow[]>(
      `SELECT n.id, n.user_id, n.folder_id, f.name AS folder_name, n.item_type,
              n.vocabulary_entry_id, e.term, e.meaning, e.phonetic, e.part_of_speech, e.context_sentence,
              n.user_example, n.user_notes, n.last_rating, n.last_reviewed_at, n.review_count, n.saved_at
       FROM user_notebook_items n
       JOIN vocabulary_folders f ON f.id = n.folder_id
       LEFT JOIN vocabulary_entries e ON e.id = n.vocabulary_entry_id
       WHERE n.user_id = $1 AND n.archived_at IS NULL ${folderClause}
       ORDER BY n.created_at DESC`,
      values,
    );
  }

  async saveNotebookItem(userId: string, dto: SaveNotebookItemDto): Promise<UserNotebookItemRow> {
    const rows = await this.dataSource.query<UserNotebookItemRow[]>(
      `INSERT INTO user_notebook_items (
        user_id, folder_id, item_type, vocabulary_entry_id, user_example, user_notes, saved_at
      ) VALUES ($1, $2, $3, $4, $5, $6, now())
      ON CONFLICT (user_id, vocabulary_entry_id) WHERE vocabulary_entry_id IS NOT NULL AND archived_at IS NULL
      DO UPDATE SET folder_id = EXCLUDED.folder_id, user_example = EXCLUDED.user_example, user_notes = EXCLUDED.user_notes, updated_at = now()
      RETURNING id, user_id, folder_id, '' AS folder_name, item_type, vocabulary_entry_id, NULL AS term, NULL AS meaning,
                NULL AS phonetic, NULL AS part_of_speech, NULL AS context_sentence, user_example, user_notes,
                last_rating, last_reviewed_at, review_count, saved_at`,
      [
        userId,
        dto.folderId,
        dto.itemType,
        dto.vocabularyEntryId ?? null,
        dto.userExample ?? null,
        dto.userNotes ?? null,
      ],
    );
    return rows[0];
  }

  async removeNotebookItem(userId: string, id: string): Promise<boolean> {
    await this.dataSource.query(
      `UPDATE user_notebook_items
       SET archived_at = now(), updated_at = now()
       WHERE id = $1 AND user_id = $2 AND archived_at IS NULL`,
      [id, userId],
    );
    return true;
  }

  async recordReviewEvent(userId: string, dto: FlashcardReviewDto): Promise<boolean> {
    return this.dataSource.transaction(async manager => {
      // 1. Verify item belongs to user
      const check = await manager.query<Array<{ id: string }>>(
        `SELECT id FROM user_notebook_items WHERE id = $1 AND user_id = $2 AND archived_at IS NULL LIMIT 1`,
        [dto.notebookItemId, userId],
      );
      if (!check[0]) return false;

      // 2. Insert event
      await manager.query(
        `INSERT INTO vocabulary_review_events (notebook_item_id, client_event_id, rating, reviewed_at, duration_ms)
         VALUES ($1, $2, $3, now(), $4)
         ON CONFLICT (notebook_item_id, client_event_id) DO NOTHING`,
        [dto.notebookItemId, dto.clientEventId, dto.rating, dto.durationMs ?? null],
      );

      // 3. Update notebook summary
      await manager.query(
        `UPDATE user_notebook_items
         SET last_rating = $1, last_reviewed_at = now(), review_count = review_count + 1, updated_at = now()
         WHERE id = $2`,
        [dto.rating, dto.notebookItemId],
      );

      return true;
    });
  }
}
