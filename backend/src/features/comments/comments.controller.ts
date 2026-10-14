import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth-user.type';
import { CommentsService } from './comments.service';
import { CommentScopeDto, CreateCommentDto, ListCommentsDto } from './comments.dto';

@Controller('comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  async list(@Query() query: ListCommentsDto) {
    return { data: await this.comments.list(query.skill, query.page) };
  }

  @Post() @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateCommentDto) {
    return { data: await this.comments.create(user.id, dto) };
  }

  @Delete(':id') @UseGuards(JwtAuthGuard)
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query() query: CommentScopeDto) {
    return { data: await this.comments.remove(user.id, id, query.skill) };
  }
}
