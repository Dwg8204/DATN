import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AiRequestRecorder } from './ai-request-recorder.service';
import { GeminiClient } from './gemini-client.service';
import { GeminiGenerationService } from './gemini-generation.service';
import { GeminiRateLimiter } from './gemini-rate-limiter.service';

/** CLI composition root. Nest applications should import AiSharedModule instead. */
export function createGeminiServices(config: ConfigService, db: DataSource) {
  const client = new GeminiClient(config, new GeminiRateLimiter(config));
  const generation = new GeminiGenerationService(
    client,
    new AiRequestRecorder(db),
  );
  return { client, generation };
}
