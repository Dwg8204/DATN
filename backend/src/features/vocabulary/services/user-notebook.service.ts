import { Injectable, NotFoundException } from '@nestjs/common';
import { UserNotebookRepository, UserNotebookItemRow } from '../repositories/user-notebook.repository';
import { SaveNotebookItemDto } from '../dto/save-notebook-item.dto';
import { FlashcardReviewDto } from '../dto/flashcard-review.dto';

@Injectable()
export class UserNotebookService {
  constructor(private readonly notebookRepo: UserNotebookRepository) {}

  async getUserNotebook(userId: string, folderId?: string): Promise<UserNotebookItemRow[]> {
    return this.notebookRepo.findUserNotebook(userId, folderId);
  }

  async saveItem(userId: string, dto: SaveNotebookItemDto): Promise<UserNotebookItemRow> {
    return this.notebookRepo.saveNotebookItem(userId, dto);
  }

  async removeItem(userId: string, id: string): Promise<{ success: boolean }> {
    await this.notebookRepo.removeNotebookItem(userId, id);
    return { success: true };
  }

  async recordFlashcardReview(userId: string, dto: FlashcardReviewDto): Promise<{ success: boolean }> {
    const success = await this.notebookRepo.recordReviewEvent(userId, dto);
    if (!success) throw new NotFoundException('Notebook item not found or unauthorized');
    return { success: true };
  }
}
