import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/types/auth-user.type';
import { DictationService } from '../services/dictation.service';
import { CreateDictationExerciseDto } from '../dto/create-dictation.dto';
import { SubmitDictationAttemptDto } from '../dto/submit-dictation.dto';

@Controller('vocabulary/dictation')
@UseGuards(JwtAuthGuard)
export class DictationController {
  constructor(private readonly dictationService: DictationService) {}

  @Get('exercises')
  async listExercises(@Query('folderId') folderId?: string) {
    const data = await this.dictationService.listExercises(folderId);
    return { data };
  }

  @Get('exercises/:id')
  async getExercise(@Param('id') id: string) {
    const data = await this.dictationService.getExercise(id);
    return { data };
  }

  @Post('exercises')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  async createExercise(@CurrentUser() user: AuthUser, @Body() dto: CreateDictationExerciseDto) {
    const data = await this.dictationService.createExercise(user.id, dto);
    return { data };
  }

  @Post('attempts')
  async submitAttempt(@CurrentUser() user: AuthUser, @Body() dto: SubmitDictationAttemptDto) {
    return this.dictationService.submitAttempt(user.id, dto);
  }
}
