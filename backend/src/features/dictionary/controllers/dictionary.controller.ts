import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { LookupWordParamsDto } from '../dto/lookup-word-params.dto';
import { DictionaryService } from '../services/dictionary.service';
import { SuggestWordsQueryDto } from '../dto/suggest-words-query.dto';

@ApiTags('Dictionary')
@ApiCookieAuth('aptimate_access_token')
@Controller('dictionary')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
export class DictionaryController {
  constructor(private readonly dictionary: DictionaryService) {}

  @Get('suggestions')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  suggest(@Query() query: SuggestWordsQueryDto) {
    return this.dictionary.suggest(query.q);
  }

  @Get(':word')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  lookup(@Param() params: LookupWordParamsDto, @Query('refresh') refresh?: string) {
    return this.dictionary.lookup(params.word, refresh === 'true');
  }
}
