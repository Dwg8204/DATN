import { ConfigService } from '@nestjs/config';
import { WritingAiConfig } from './writing-ai-config.service';

describe('Writing AI configuration isolation', () => {
  const free = {
    WRITING_AI_ENABLED: true,
    GEMINI_API_KEY: 'gemini-test-key-long-enough',
    GEMINI_BILLING_TIER: 'FREE',
    GEMINI_FREE_PROJECT_CONFIRMED: true,
  };
  it('can be disabled without keys and does not depend on Speaking flags', () => {
    expect(new WritingAiConfig(new ConfigService({ SPEAKING_AI_ENABLED: true })).enabled).toBe(false);
  });
  it('uses the existing Gemini key/model without Groq or Cloudinary', () => {
    const config = new WritingAiConfig(new ConfigService(free));
    expect(config.snapshot('vi').model).toBe('gemini-3.1-flash-lite');
    expect(config.enabled).toBe(true);
    expect(config.snapshot('en').feedbackLocale).toBe('vi');
    expect(config.snapshot('en').promptVersion).toBe('writing-prompt-v3');
  });
  it.each([
    { ...free, GEMINI_BILLING_TIER: 'PAID' },
    { ...free, GEMINI_PAID_PROJECT_CONFIRMED: true },
    { ...free, GEMINI_API_KEY: '' },
    { ...free, GEMINI_FREE_PROJECT_CONFIRMED: false },
  ])('refuses unconfirmed or paid config', (values) => {
    expect(() => new WritingAiConfig(new ConfigService(values))).toThrow('Writing AI requires');
  });
});
