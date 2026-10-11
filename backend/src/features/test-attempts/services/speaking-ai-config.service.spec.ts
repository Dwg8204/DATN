import { ConfigService } from '@nestjs/config';
import { SpeakingAiConfig } from './speaking-ai-config.service';
const configured = { SPEAKING_AI_ENABLED: true, GROQ_API_KEY: 'g'.repeat(30), GEMINI_API_KEY: 'm'.repeat(30),
  GEMINI_PAID_PROJECT_CONFIRMED: true, GROQ_FREE_TIER_CONFIRMED: true, SPEAKING_ADULT_ONLY_CONFIRMED: true,
  SPEAKING_AI_PRICING_VERIFIED: true, cloudinary: { cloudName: 'test', enabled: true } };
describe('Speaking AI config safety', () => {
  it('requires explicit Free project confirmation and records zero Gemini cost', () => {
    const free = { ...configured, GEMINI_BILLING_TIER: 'FREE', GEMINI_PAID_PROJECT_CONFIRMED: false, GEMINI_FREE_PROJECT_CONFIRMED: true };
    const config = new SpeakingAiConfig(new ConfigService(free));
    expect(config.tier).toBe('FREE');
    expect(config.inputRate).toBe(0);
    expect(config.outputRate).toBe(0);
    expect(config.policyVersion).toBe('speaking-ai-free-v2');
    expect(() => new SpeakingAiConfig(new ConfigService({ ...free, GEMINI_FREE_PROJECT_CONFIRMED: false }))).toThrow();
    expect(() => new SpeakingAiConfig(new ConfigService({ ...free, GEMINI_PAID_PROJECT_CONFIRMED: true }))).toThrow();
  });
  it('uses the affordable audio model and matching conservative rates', () => {
    const config = new SpeakingAiConfig(new ConfigService(configured));
    expect(config.model).toBe('gemini-3.1-flash-lite');
    expect(config.inputRate).toBe(.5);
    expect(config.outputRate).toBe(1.5);
  });
  it('is off by default', () => expect(new SpeakingAiConfig(new ConfigService()).enabled).toBe(false));
  it('uses project-local binaries when env keeps ffmpeg / ffprobe defaults', () => {
    const config = new SpeakingAiConfig(new ConfigService(configured));
    expect(config.ffmpeg).not.toBe('ffmpeg');
    expect(config.ffprobe).not.toBe('ffprobe');
  });
  it('preserves explicitly configured system binary paths', () => {
    const config = new SpeakingAiConfig(new ConfigService({ ...configured, SPEAKING_FFMPEG_PATH: 'C:/tools/ffmpeg.exe', SPEAKING_FFPROBE_PATH: 'C:/tools/ffprobe.exe' }));
    expect(config.ffmpeg).toBe('C:/tools/ffmpeg.exe');
    expect(config.ffprobe).toBe('C:/tools/ffprobe.exe');
  });
  it('accepts the confirmed USD1 paid-audio configuration', () => expect(new SpeakingAiConfig(new ConfigService(configured)).cap).toBe(1));
  it.each(['GEMINI_PAID_PROJECT_CONFIRMED','GROQ_FREE_TIER_CONFIRMED','SPEAKING_ADULT_ONLY_CONFIRMED','SPEAKING_AI_PRICING_VERIFIED'])(
    'cannot enable without %s', flag => expect(() => new SpeakingAiConfig(new ConfigService({ ...configured, [flag]: false }))).toThrow());
  it.each([2,0,-1,NaN])('rejects cap %s', cap => expect(() => new SpeakingAiConfig(new ConfigService({ ...configured, SPEAKING_AI_MONTHLY_BUDGET_USD: cap }))).toThrow());
  it('rejects underestimating audio input price', () => expect(() => new SpeakingAiConfig(new ConfigService({ ...configured, GEMINI_INPUT_USD_PER_MILLION: .3 }))).toThrow());
});
