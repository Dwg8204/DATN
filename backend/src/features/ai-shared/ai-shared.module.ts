import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiRequestRecorder } from './ai-request-recorder.service';
import { GeminiClient } from './gemini-client.service';
import { GeminiGenerationService } from './gemini-generation.service';
import { GeminiRateLimiter } from './gemini-rate-limiter.service';

@Module({
  imports: [ConfigModule],
  providers: [
    GeminiRateLimiter,
    GeminiClient,
    AiRequestRecorder,
    GeminiGenerationService,
  ],
  exports: [GeminiClient, GeminiGenerationService],
})
export class AiSharedModule {}
