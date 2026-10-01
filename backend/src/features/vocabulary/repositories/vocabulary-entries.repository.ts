import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateEntryDto } from '../dto/create-entry.dto';
import { QueryEntryDto } from '../dto/query-entry.dto';

export type VocabularyEntryRow = {
  id: string;
  owner_id: string | null;
  default_folder_id: string | null;
  item_type: string;
  term: string;
  normalized_term: string;
  language_code: string;
  meaning_language: string;
  meaning: string;
  phonetic: string | null;
  part_of_speech: string | null;
  context_sentence: string | null;
  source_type: string;
  created_at: Date;
};

@Injectable()
export class VocabularyEntriesRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findEntries(query: QueryEntryDto, userId?: string): Promise<{ data: VocabularyEntryRow[]; total: number }> {
    const values: unknown[] = [];
    const where: string[] = ['(owner_id IS NULL OR owner_id = $1)'];
    values.push(userId ?? null);

    if (query.folderId) {
      values.push(query.folderId);
      where.push(`default_folder_id = $${values.length}`);
    }

    if (query.search) {
      values.push(`%${query.search.trim().toLowerCase()}%`);
      where.push(`(lower(term) LIKE $${values.length} OR lower(meaning) LIKE $${values.length})`);
    }

    const whereSql = where.join(' AND ');
    const offset = (query.page - 1) * query.pageSize;
    const limitParam = `$${values.length + 1}`;
    const offsetParam = `$${values.length + 2}`;

    const [rows, countRows] = await Promise.all([
      this.dataSource.query<VocabularyEntryRow[]>(
        `SELECT id, owner_id, default_folder_id, item_type, term, normalized_term,
                language_code, meaning_language, meaning, phonetic, part_of_speech,
                context_sentence, source_type, created_at
         FROM vocabulary_entries
         WHERE ${whereSql}
         ORDER BY created_at DESC
         LIMIT ${limitParam} OFFSET ${offsetParam}`,
        [...values, query.pageSize, offset],
      ),
      this.dataSource.query<Array<{ total: string }>>(
        `SELECT count(*)::text AS total FROM vocabulary_entries WHERE ${whereSql}`,
        values,
      ),
    ]);

    return {
      data: rows,
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async findById(id: string): Promise<VocabularyEntryRow | null> {
    const rows = await this.dataSource.query<VocabularyEntryRow[]>(
      `SELECT id, owner_id, default_folder_id, item_type, term, normalized_term,
              language_code, meaning_language, meaning, phonetic, part_of_speech,
              context_sentence, source_type, created_at
       FROM vocabulary_entries
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async create(ownerId: string | null, dto: CreateEntryDto): Promise<VocabularyEntryRow> {
    const normalizedTerm = dto.term.trim().toLowerCase();
    const cacheKey = `${normalizedTerm}:${dto.languageCode ?? 'en'}:${dto.meaningLanguage ?? 'vi'}`;

    const rows = await this.dataSource.query<VocabularyEntryRow[]>(
      `INSERT INTO vocabulary_entries (
        owner_id, default_folder_id, item_type, term, normalized_term,
        language_code, meaning_language, meaning, phonetic, part_of_speech,
        context_sentence, source_type, cache_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, owner_id, default_folder_id, item_type, term, normalized_term,
                language_code, meaning_language, meaning, phonetic, part_of_speech,
                context_sentence, source_type, created_at`,
      [
        ownerId,
        dto.defaultFolderId ?? null,
        dto.itemType,
        dto.term,
        normalizedTerm,
        dto.languageCode ?? 'en',
        dto.meaningLanguage ?? 'vi',
        dto.meaning,
        dto.phonetic ?? null,
        dto.partOfSpeech ?? null,
        dto.contextSentence ?? null,
        dto.sourceType ?? 'SYSTEM',
        cacheKey,
      ],
    );
    return rows[0];
  }
}
