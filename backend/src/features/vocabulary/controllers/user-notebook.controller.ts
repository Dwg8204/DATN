import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/types/auth-user.type';
import { UserNotebookService } from '../services/user-notebook.service';
import { SaveNotebookItemDto } from '../dto/save-notebook-item.dto';
import { FlashcardReviewDto } from '../dto/flashcard-review.dto';

@Controller('vocabulary/notebook')
@UseGuards(JwtAuthGuard)
export class UserNotebookController {
  constructor(private readonly notebookService: UserNotebookService) {}

  @Get()
  async getNotebook(@CurrentUser() user: AuthUser, @Query('folderId') folderId?: string) {
    const data = await this.notebookService.getUserNotebook(user.id, folderId);
    return { data };
  }

  @Post()
  async saveItem(@CurrentUser() user: AuthUser, @Body() dto: SaveNotebookItemDto) {
    const data = await this.notebookService.saveItem(user.id, dto);
    return { data };
  }

  @Delete(':id')
  async removeItem(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notebookService.removeItem(user.id, id);
  }

  @Post('review-event')
  async recordReview(@CurrentUser() user: AuthUser, @Body() dto: FlashcardReviewDto) {
    return this.notebookService.recordFlashcardReview(user.id, dto);
  }
}
