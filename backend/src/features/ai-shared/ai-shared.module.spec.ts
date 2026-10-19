import { Global, Injectable, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ChatbotProvider } from '../chatbot/chatbot.provider';
import { AiSharedModule } from './ai-shared.module';
import { GeminiClient } from './gemini-client.service';
import { GeminiGenerationService } from './gemini-generation.service';

const query = jest.fn().mockResolvedValue([]);

@Global()
@Module({
  providers: [{ provide: DataSource, useValue: { query } }],
  exports: [DataSource],
})
class TestDatabaseModule {}

@Injectable()
class PersonalizationConsumer {
  constructor(
    readonly client: GeminiClient,
    readonly generation: GeminiGenerationService,
  ) {}
}

@Module({
  imports: [AiSharedModule],
  providers: [PersonalizationConsumer],
  exports: [PersonalizationConsumer],
})
class TestPersonalizationModule {}

describe('AiSharedModule integration', () => {
  test('chatbot and a separate feature resolve the same shared client and quota window', async () => {
    const config = new ConfigService({
      CHATBOT_ENABLED: true,
      CHATBOT_MODEL: 'test-model',
      GEMINI_API_KEY: 'test-only',
      GEMINI_BILLING_TIER: 'FREE',
      GEMINI_FREE_PROJECT_CONFIRMED: true,
      GEMINI_MAX_RPM: 1,
    });
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        TestDatabaseModule,
        AiSharedModule,
        TestPersonalizationModule,
      ],
      providers: [ChatbotProvider],
    })
      .overrideProvider(ConfigService)
      .useValue(config)
      .compile();
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: 'STOP',
                content: { role: 'model', parts: [{ text: '{}' }] },
              },
            ],
          }),
        ),
    );
    try {
      const chatbot = module.get(ChatbotProvider);
      const personalization = module.get(PersonalizationConsumer);
      expect(personalization.client).toBe(module.get(GeminiClient));
      await chatbot.generate(
        'system',
        [],
        [],
        { userId: 'user', messageId: 'message' },
        new AbortController().signal,
      );
      await expect(
        personalization.generation.generate(
          {
            model: 'test-model',
            system: 'system',
            contents: [],
            responseSchema: { type: 'OBJECT' },
            context: {
              userId: 'user',
              purpose: 'PERSONAL_COMMENT',
              promptVersion: 'v1',
            },
          },
          new AbortController().signal,
        ),
      ).rejects.toMatchObject({ reason: 'QUOTA' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      fetchMock.mockRestore();
      await module.close();
    }
  });
});
