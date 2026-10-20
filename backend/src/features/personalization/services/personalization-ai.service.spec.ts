import { ConfigService } from '@nestjs/config';
import { JsonGenerationService } from '../../ai-shared/json-generation.service';
import { PersonalizationAiService } from './personalization-ai.service';

describe('personalization provider configuration', () => {
  const content = { summary: 'Tiếp tục luyện tập.', strengths: [], focus: [] };
  it.each(['gemini', 'deepseek', 'xai', 'openai-compatible'])(
    'switches %s without changing the comment contract',
    async (provider) => {
      const generate = jest
        .fn()
        .mockResolvedValue({
          text: JSON.stringify(content),
          requestId: 'request',
        });
      const service = new PersonalizationAiService(
        new ConfigService({
          PERSONALIZATION_PROVIDER: provider,
          PERSONALIZATION_MODEL: 'selected-model',
        }),
        { generate } as unknown as JsonGenerationService,
      );
      expect(await service.comment('user', {})).toEqual({
        content,
        requestId: 'request',
      });
      expect(generate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider,
          model: 'selected-model',
          temperature: 0.2,
        }),
        expect.anything(),
      );
    },
  );
  it('requires an explicit model for non-Gemini providers', async () => {
    const generate = jest.fn();
    const service = new PersonalizationAiService(
      new ConfigService({
        PERSONALIZATION_PROVIDER: 'deepseek',
        CHATBOT_MODEL: 'gemini-model',
      }),
      { generate } as unknown as JsonGenerationService,
    );
    await expect(service.comment('user', {})).rejects.toHaveProperty(
      'reason',
      'CONFIG_INVALID',
    );
    expect(generate).not.toHaveBeenCalled();
  });
  it('validates content from compatible providers using the same rules', async () => {
    const generate = jest
      .fn()
      .mockResolvedValue({
        text: JSON.stringify({ ...content, summary: 'Bạn đã làm 999 bài.' }),
        requestId: 'request',
      });
    const service = new PersonalizationAiService(
      new ConfigService({
        PERSONALIZATION_PROVIDER: 'xai',
        PERSONALIZATION_MODEL: 'chosen-model',
      }),
      { generate } as unknown as JsonGenerationService,
    );
    await expect(
      service.comment('user', { completed: 2 }),
    ).rejects.toHaveProperty('issues', ['UNSUPPORTED_NUMBER']);
  });
});
