import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/types/auth-user.type';
import { VocabularyFoldersService } from '../services/vocabulary-folders.service';
import { CreateFolderDto } from '../dto/create-folder.dto';
import { UpdateFolderDto } from '../dto/update-folder.dto';

@Controller('vocabulary/folders')
@UseGuards(JwtAuthGuard)
export class VocabularyFoldersController {
  constructor(private readonly foldersService: VocabularyFoldersService) {}

  @Get()
  async getFolders(@CurrentUser() user: AuthUser) {
    const data = await this.foldersService.listFolders(user.id);
    return { data };
  }

  @Post()
  async createFolder(@CurrentUser() user: AuthUser, @Body() dto: CreateFolderDto) {
    const data = await this.foldersService.createFolder(user.id, dto);
    return { data };
  }

  @Patch(':id')
  async updateFolder(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateFolderDto,
  ) {
    const data = await this.foldersService.updateFolder(id, user.id, dto);
    return { data };
  }

  @Delete(':id')
  async deleteFolder(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.foldersService.archiveFolder(id, user.id);
  }
}
