import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ImportStudyDto, StudyItemDto, StudyKind } from '../dto/study-item.dto';
import { STUDY_TOPICS } from '../data/dictation-defaults-v1';

@Injectable()
export class StudyRepository {
  constructor(private readonly db: DataSource) {}

  private async lock(m: EntityManager, userId: string) {
    await m.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`vocabulary:${userId}`]);
  }

  private async folder(m: EntityManager, userId: string, id: string) {
    const [row] = await m.query(`SELECT id FROM vocabulary_folders
      WHERE id=$1 AND (owner_id IS NULL OR owner_id=$2) AND archived_at IS NULL`, [id, userId]);
    if (!row) throw new NotFoundException('Topic not found or unavailable.');
  }

  async bootstrap(userId: string) {
    await this.db.transaction(async m => {
      await this.lock(m, userId);
      await m.query(`INSERT INTO user_notebook_items(user_id,folder_id,item_type,vocabulary_entry_id,legacy_key,saved_at)
        SELECT $1,default_folder_id,'WORD',id,'legacy:' || source_key,now() FROM vocabulary_entries e
        WHERE owner_id IS NULL AND source_key IS NOT NULL
        ON CONFLICT DO NOTHING`, [userId]);
      await m.query(`INSERT INTO user_notebook_items(user_id,folder_id,item_type,custom_content,dictation_exercise_id,legacy_key,saved_at)
        SELECT $1,folder_id,'SENTENCE',jsonb_build_object('word',title,'meaning',transcript,'accent',locale),
          id,'legacy:' || source_key,now() FROM dictation_exercises e
        WHERE created_by IS NULL AND source_key IS NOT NULL AND status='PUBLISHED'
        ON CONFLICT DO NOTHING`, [userId]);
    });
  }

  async state(userId: string) {
    await this.bootstrap(userId);
    const [topics, rows] = await Promise.all([
      this.db.query(`SELECT id,name,description,(owner_id IS NULL) AS is_system
        FROM vocabulary_folders WHERE (owner_id IS NULL OR owner_id=$1) AND archived_at IS NULL
        ORDER BY owner_id NULLS FIRST,created_at,id`, [userId]),
      this.db.query(`SELECT n.id,n.folder_id,f.name AS topic,n.item_type,n.legacy_key,n.legacy_progress,
        n.last_rating,n.review_count,n.dictation_exercise_id,
        COALESCE(n.custom_content->>'word',e.term) AS word,
        COALESCE(n.custom_content->>'meaning',e.meaning) AS meaning,
        COALESCE(n.custom_content->>'pronunciation',e.phonetic,'') AS pronunciation,
        COALESCE(n.custom_content->>'type',e.part_of_speech,'') AS type,
        COALESCE(n.custom_content->>'example',n.user_example,e.context_sentence,'') AS example,
        x.title,x.transcript,x.locale,x.practice_level,
        (n.vocabulary_entry_id IS NULL AND (n.item_type<>'SENTENCE' OR x.created_by IS NOT NULL)) AS custom,
        a.attempts,a.best_accuracy,a.latest_accuracy,a.updated_at
        FROM user_notebook_items n JOIN vocabulary_folders f ON f.id=n.folder_id
        LEFT JOIN vocabulary_entries e ON e.id=n.vocabulary_entry_id
        LEFT JOIN dictation_exercises x ON x.id=n.dictation_exercise_id
        LEFT JOIN LATERAL (
          SELECT count(*)::int AS attempts,max(accuracy) AS best_accuracy,
            (array_agg(accuracy ORDER BY submitted_at DESC,id DESC))[1] AS latest_accuracy,max(submitted_at) AS updated_at
          FROM dictation_attempts WHERE user_id=$1 AND exercise_id=n.dictation_exercise_id
        ) a ON true
        WHERE n.user_id=$1 AND n.archived_at IS NULL AND n.is_saved=true AND f.archived_at IS NULL
        ORDER BY n.created_at DESC,n.id`, [userId]),
    ]);
    const words: any[] = [], exercises: any[] = [];
    const progress: Record<string, unknown> = {}, ratings: Record<string, string> = {};
    for (const row of rows) {
      const item = { id: row.id, folderId: row.folder_id, topic: row.topic, word: row.word,
        meaning: row.meaning, pronunciation: row.pronunciation, type: row.type, example: row.example,
        custom: row.custom, legacyId: row.legacy_key?.replace(/^legacy:/, '') };
      if (row.item_type !== 'SENTENCE') {
        words.push(item);
        if (row.last_rating) ratings[row.id] = row.last_rating === 'KNOWN' ? 'know' : 'learning';
      } else if (row.dictation_exercise_id) {
        const id = row.dictation_exercise_id;
        exercises.push({ ...item, id, notebookId: row.id, title: row.title, transcript: row.transcript,
          word: row.title, meaning: row.transcript, accent: row.locale, level: row.practice_level });
        const legacy = row.legacy_progress || {};
        if (row.attempts > 0 || legacy.attempts > 0) progress[id] = {
          attempts: Number(row.attempts || 0) + Number(legacy.attempts || 0),
          lastAccuracy: row.latest_accuracy != null ? Math.round(Number(row.latest_accuracy)) : legacy.lastAccuracy,
          bestAccuracy: Math.max(Number(row.best_accuracy || 0), Number(legacy.bestAccuracy || 0)),
          updatedAt: row.updated_at || legacy.updatedAt, imported: !row.attempts && Boolean(legacy.attempts),
        };
      }
    }
    const topicOrder = (f: any) => {
      const index = STUDY_TOPICS.findIndex(t => t[1] === f.name);
      return f.is_system && index >= 0 ? index : STUDY_TOPICS.length;
    };
    return { topics: topics.map((f: any) => ({ ...f, legacyId: STUDY_TOPICS.find(t => t[1] === f.name)?.[0] }))
      .sort((a: any, b: any) => topicOrder(a) - topicOrder(b)), words, exercises, progress, ratings };
  }

  async create(userId: string, dto: StudyItemDto) {
    return this.db.transaction(async m => {
      await this.lock(m, userId);
      return this.insertItem(m, userId, dto, dto.clientRequestId ? `request:${dto.clientRequestId}` : null);
    });
  }

  private async insertItem(m: EntityManager, userId: string, dto: StudyItemDto, key: string | null) {
    if (key) {
      const [existing] = await m.query('SELECT id,folder_id,custom_content FROM user_notebook_items WHERE user_id=$1 AND legacy_key=$2', [userId, key]);
      if (existing) {
        if (key.startsWith('request:') && (existing.folder_id !== dto.folderId
          || JSON.stringify(this.content(existing.custom_content)) !== JSON.stringify(this.content(dto)))) {
          throw new ConflictException('Creation identifier already used for another item.');
        }
        return { id: existing.id };
      }
    }
    await this.folder(m, userId, dto.folderId);
    let exerciseId: string | null = null;
    if (dto.kind === StudyKind.SENTENCE) {
      const [exercise] = await m.query(`INSERT INTO dictation_exercises(created_by,folder_id,title,transcript,audio_source,locale,status,is_personal)
        VALUES($1,$2,$3,$4,'TTS',$5,'PUBLISHED',true) RETURNING id`, [userId, dto.folderId, dto.word, dto.meaning, dto.accent || 'en-GB']);
      exerciseId = exercise.id;
    }
    const [item] = await m.query(`INSERT INTO user_notebook_items(user_id,folder_id,item_type,custom_content,dictation_exercise_id,legacy_key,saved_at)
      VALUES($1,$2,$3,$4::jsonb,$5,$6,now()) RETURNING id`,
    [userId, dto.folderId, dto.kind, JSON.stringify(this.content(dto)), exerciseId, key]);
    return item;
  }

  async update(userId: string, id: string, dto: StudyItemDto) {
    return this.db.transaction(async m => {
      await this.lock(m, userId);
      return this.updateItem(m, userId, id, dto);
    });
  }

  private async updateItem(m: EntityManager, userId: string, id: string, dto: StudyItemDto) {
    const [n] = await m.query(`SELECT n.*,x.created_by,x.is_personal,x.title,x.transcript,x.locale FROM user_notebook_items n
      LEFT JOIN dictation_exercises x ON x.id=n.dictation_exercise_id
      WHERE n.id=$1 AND n.user_id=$2 AND n.archived_at IS NULL FOR UPDATE OF n`, [id, userId]);
    if (!n) throw new NotFoundException('Notebook item not found.');
    if ((n.item_type === 'SENTENCE') !== (dto.kind === StudyKind.SENTENCE)) throw new BadRequestException('Cannot change item kind.');
    await this.folder(m, userId, dto.folderId);
    let exerciseId = n.dictation_exercise_id;
    if (dto.kind === StudyKind.SENTENCE) {
      if (n.is_personal && n.created_by === userId) {
        await m.query(`UPDATE dictation_exercises SET title=$1,transcript=$2,folder_id=$3,locale=$4,
          content_version=content_version+1,updated_at=now() WHERE id=$5 AND created_by=$6`,
        [dto.word, dto.meaning, dto.folderId, dto.accent || 'en-GB', exerciseId, userId]);
      } else if (n.title !== dto.word || n.transcript !== dto.meaning || n.folder_id !== dto.folderId || n.locale !== (dto.accent || 'en-GB')) {
        const [copy] = await m.query(`INSERT INTO dictation_exercises(created_by,folder_id,title,transcript,audio_source,locale,status,is_personal)
          VALUES($1,$2,$3,$4,'TTS',$5,'PUBLISHED',true) RETURNING id`, [userId, dto.folderId, dto.word, dto.meaning, dto.accent || 'en-GB']);
        exerciseId = copy.id;
        // Keep this user's history with their personal copy, without changing anyone else's exercise.
        await m.query('UPDATE dictation_attempts SET exercise_id=$1 WHERE user_id=$2 AND exercise_id=$3', [exerciseId, userId, n.dictation_exercise_id]);
      }
    }
    await m.query(`UPDATE user_notebook_items SET folder_id=$1,custom_content=$2::jsonb,vocabulary_entry_id=NULL,
      dictation_exercise_id=$3,updated_at=now() WHERE id=$4 AND user_id=$5`, [dto.folderId, JSON.stringify(this.content(dto)), exerciseId, id, userId]);
    return { id };
  }

  async remove(userId: string, id: string) {
    const [rows] = await this.db.query(`UPDATE user_notebook_items SET archived_at=now(),updated_at=now()
      WHERE id=$1 AND user_id=$2 AND archived_at IS NULL RETURNING id`, [id, userId]);
    if (!rows[0]) throw new NotFoundException('Notebook item not found.');
    return { success: true };
  }

  async importBrowser(userId: string, dto: ImportStudyDto) {
    await this.bootstrap(userId);
    return this.db.transaction(async m => {
      await this.lock(m, userId);
      const folders = await m.query(`SELECT id,name FROM vocabulary_folders
        WHERE (owner_id IS NULL OR owner_id=$1) AND archived_at IS NULL`, [userId]);
      const byName = new Map<string, string>(folders.map((f: any) => [f.name.toLowerCase(), f.id]));
      for (const name of [...dto.topics, ...dto.items.map(i => i.topic)]) {
        const normalized = name.trim();
        if (!normalized) throw new BadRequestException('Topic name cannot be empty.');
        if (!byName.has(normalized.toLowerCase())) {
          const [folder] = await m.query('INSERT INTO vocabulary_folders(owner_id,name) VALUES($1,$2) RETURNING id', [userId, normalized]);
          byName.set(normalized.toLowerCase(), folder.id);
        }
      }
      let imported = 0;
      for (const item of dto.items) {
        const key = `legacy:${item.legacyId}`;
        const [existing] = await m.query(`SELECT id,legacy_imported_at,archived_at,custom_content->>'kind' AS edited_kind
          FROM user_notebook_items WHERE user_id=$1 AND legacy_key=$2`, [userId, key]);
        if (existing?.legacy_imported_at || existing?.archived_at || existing?.edited_kind) continue;
        const content: StudyItemDto = { ...item, folderId: byName.get(item.topic.trim().toLowerCase())! };
        const saved = existing ? await this.updateItem(m, userId, existing.id, content) : await this.insertItem(m, userId, content, key);
        await m.query(`UPDATE user_notebook_items SET legacy_imported_at=now(),legacy_progress=$1::jsonb,
          last_rating=COALESCE(last_rating,$2::vocabulary_rating),review_count=GREATEST(review_count,$3),
          archived_at=CASE WHEN $4 THEN now() ELSE archived_at END WHERE id=$5 AND user_id=$6`,
        [item.progress ? JSON.stringify(item.progress) : null, item.rating || null, item.rating ? 1 : 0, Boolean(item.hidden), saved.id, userId]);
        imported++;
      }
      return { imported };
    });
  }

  private content(dto: Partial<StudyItemDto>) {
    return { kind: dto.kind, word: dto.word, meaning: dto.meaning, pronunciation: dto.pronunciation || '',
      type: dto.type || '', example: dto.example || '', accent: dto.accent || 'en-GB' };
  }
}
