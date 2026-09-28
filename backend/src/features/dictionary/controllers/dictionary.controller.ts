import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { LookupWordParamsDto } from '../dto/lookup-word-params.dto';
import { DictionaryService } from '../services/dictionary.service';

@ApiTags('Dictionary')
@ApiCookieAuth('aptimate_access_token')
@Controller('dictionary')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
export class DictionaryController {
  constructor(private readonly dictionary: DictionaryService) {}

  @Get(':word')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  lookup(@Param() params: LookupWordParamsDto, @Query('refresh') refresh?: string) {
    return this.dictionary.lookup(params.word, refresh === 'true');
  }
}
