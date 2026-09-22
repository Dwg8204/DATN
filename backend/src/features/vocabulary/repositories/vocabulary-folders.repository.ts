import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateFolderDto } from '../dto/create-folder.dto';
import { UpdateFolderDto } from '../dto/update-folder.dto';

export type VocabularyFolderRow = {
  id: string;
  owner_id: string | null;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class VocabularyFoldersRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findAllForUser(userId: string): Promise<VocabularyFolderRow[]> {
    return this.dataSource.query<VocabularyFolderRow[]>(
      `SELECT id, owner_id, name, description, (owner_id IS NULL) AS is_system, created_at, updated_at
       FROM vocabulary_folders
       WHERE (owner_id IS NULL OR owner_id = $1) AND archived_at IS NULL
       ORDER BY is_system DESC, created_at DESC`,
      [userId],
    );
  }

  async findById(id: string, userId: string): Promise<VocabularyFolderRow | null> {
    const rows = await this.dataSource.query<VocabularyFolderRow[]>(
      `SELECT id, owner_id, name, description, (owner_id IS NULL) AS is_system, created_at, updated_at
       FROM vocabulary_folders
       WHERE id = $1 AND (owner_id IS NULL OR owner_id = $2) AND archived_at IS NULL
       LIMIT 1`,
      [id, userId],
    );
    return rows[0] ?? null;
  }

  async create(ownerId: string, dto: CreateFolderDto): Promise<VocabularyFolderRow> {
    const rows = await this.dataSource.query<VocabularyFolderRow[]>(
      `INSERT INTO vocabulary_folders (owner_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING id, owner_id, name, description, false AS is_system, created_at, updated_at`,
      [ownerId, dto.name, dto.description ?? null],
    );
    return rows[0];
  }

  async update(id: string, ownerId: string, dto: UpdateFolderDto): Promise<VocabularyFolderRow | null> {
    const rows = await this.dataSource.query<VocabularyFolderRow[]>(
      `UPDATE vocabulary_folders
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           updated_at = now()
       WHERE id = $3 AND owner_id = $4 AND archived_at IS NULL
       RETURNING id, owner_id, name, description, false AS is_system, created_at, updated_at`,
      [dto.name ?? null, dto.description ?? null, id, ownerId],
    );
    return rows[0] ?? null;
  }

  async archive(id: string, ownerId: string): Promise<boolean> {
    const result = await this.dataSource.query<{ affected?: number }>(
      `UPDATE vocabulary_folders
       SET archived_at = now(), updated_at = now()
       WHERE id = $1 AND owner_id = $2 AND archived_at IS NULL`,
      [id, ownerId],
    );
    return true;
  }
}
