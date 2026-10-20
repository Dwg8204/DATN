import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiRequestRecorder } from './ai-request-recorder.service';
import { GeminiClient } from './gemini-client.service';
import { GeminiGenerationService } from './gemini-generation.service';
import { GeminiRateLimiter } from './gemini-rate-limiter.service';
import {
  GeminiJsonProvider,
  OpenAiCompatibleJsonProvider,
  JsonGenerationService,
} from './json-generation.service';

@Module({
  imports: [ConfigModule],
  providers: [
    GeminiRateLimiter,
    GeminiClient,
    AiRequestRecorder,
    GeminiGenerationService,
    GeminiJsonProvider,
    OpenAiCompatibleJsonProvider,
    JsonGenerationService,
  ],
  exports: [GeminiClient, GeminiGenerationService, JsonGenerationService],
})
export class AiSharedModule {}
