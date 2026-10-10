import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/types/auth-user.type';
import { StudyRepository } from '../repositories/study.repository';
import { ImportStudyDto, StudyItemDto } from '../dto/study-item.dto';

@Controller('vocabulary/study')
@UseGuards(JwtAuthGuard)
export class StudyController {
  constructor(private readonly study: StudyRepository) {}
  @Get() state(@CurrentUser() user: AuthUser) { return this.study.state(user.id); }
  @Post('items') create(@CurrentUser() user: AuthUser, @Body() dto: StudyItemDto) { return this.study.create(user.id, dto); }
  @Patch('items/:id') update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: StudyItemDto) { return this.study.update(user.id, id, dto); }
  @Delete('items/:id') remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.study.remove(user.id, id); }
  @Post('import-browser') import(@CurrentUser() user: AuthUser, @Body() dto: ImportStudyDto) { return this.study.importBrowser(user.id, dto); }
}
