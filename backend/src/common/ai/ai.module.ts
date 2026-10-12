import { Module } from '@nestjs/common';
import { AI_PROVIDER } from './ai-provider.interface';
import { GeminiProvider } from './providers/gemini.provider';

@Module({ providers: [{ provide: AI_PROVIDER, useClass: GeminiProvider }], exports: [AI_PROVIDER] })
export class AiModule {}
