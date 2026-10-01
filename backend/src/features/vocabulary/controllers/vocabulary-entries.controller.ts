import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/types/auth-user.type';
import { VocabularyEntriesService } from '../services/vocabulary-entries.service';
import { CreateEntryDto } from '../dto/create-entry.dto';
import { QueryEntryDto } from '../dto/query-entry.dto';

@Controller('vocabulary/entries')
@UseGuards(JwtAuthGuard)
export class VocabularyEntriesController {
  constructor(private readonly entriesService: VocabularyEntriesService) {}

  @Get()
  async getEntries(@Query() query: QueryEntryDto, @CurrentUser() user: AuthUser) {
    return this.entriesService.listEntries(query, user.id);
  }

  @Get(':id')
  async getEntryById(@Param('id') id: string) {
    const data = await this.entriesService.getEntryById(id);
    return { data };
  }

  @Post()
  async createEntry(@CurrentUser() user: AuthUser, @Body() dto: CreateEntryDto) {
    const data = await this.entriesService.createEntry(user.id, dto);
    return { data };
  }
}
