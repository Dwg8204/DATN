import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { VocabularyFoldersRepository, VocabularyFolderRow } from '../repositories/vocabulary-folders.repository';
import { CreateFolderDto } from '../dto/create-folder.dto';
import { UpdateFolderDto } from '../dto/update-folder.dto';

@Injectable()
export class VocabularyFoldersService {
  constructor(private readonly foldersRepo: VocabularyFoldersRepository) {}

  async listFolders(userId: string): Promise<VocabularyFolderRow[]> {
    return this.foldersRepo.findAllForUser(userId);
  }

  async createFolder(userId: string, dto: CreateFolderDto): Promise<VocabularyFolderRow> {
    return this.foldersRepo.create(userId, dto);
  }

  async updateFolder(id: string, userId: string, dto: UpdateFolderDto): Promise<VocabularyFolderRow> {
    const existing = await this.foldersRepo.findById(id, userId);
    if (!existing) throw new NotFoundException('Folder not found');
    if (existing.is_system) throw new ForbiddenException('Cannot modify system folder');

    const updated = await this.foldersRepo.update(id, userId, dto);
    if (!updated) throw new NotFoundException('Folder not found');
    return updated;
  }

  async archiveFolder(id: string, userId: string): Promise<{ success: boolean }> {
    const existing = await this.foldersRepo.findById(id, userId);
    if (!existing) throw new NotFoundException('Folder not found');
    if (existing.is_system) throw new ForbiddenException('Cannot delete system folder');

    await this.foldersRepo.archive(id, userId);
    return { success: true };
  }
}
