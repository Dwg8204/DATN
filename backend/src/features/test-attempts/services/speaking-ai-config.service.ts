import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRequire } from 'node:module';

const loadBinaryPackage = createRequire(__filename);
const ffmpegPath = loadBinaryPackage('ffmpeg-static') as string | null;
const bundledProbe = loadBinaryPackage('ffprobe-static') as { path: string };

@Injectable()
export class SpeakingAiConfig {
  readonly enabled: boolean;
  readonly groqKey: string;
  readonly geminiKey: string;
  readonly model = 'gemini-3.1-flash-lite';
  readonly tier: 'FREE' | 'PAID';
  readonly policyVersion: string;
  readonly inputRate: number;
  readonly outputRate: number;
  readonly cap: number;
  readonly cloud: string;
  readonly folder: string;
  readonly ffmpeg: string;
  readonly ffprobe: string;
  constructor(config: ConfigService) {
    const flag = (key: string) => String(config.get(key, 'false')) === 'true';
    this.enabled = flag('SPEAKING_AI_ENABLED');
    this.tier = config.get('GEMINI_BILLING_TIER', 'PAID');
    this.policyVersion = this.tier === 'FREE' ? 'speaking-ai-free-v2' : 'speaking-ai-v1';
    this.groqKey = config.get('GROQ_API_KEY', '');
    this.geminiKey = config.get('GEMINI_API_KEY', '');
    this.inputRate = Number(config.get('GEMINI_INPUT_USD_PER_MILLION', .5));
    this.outputRate = Number(config.get('GEMINI_OUTPUT_USD_PER_MILLION', 1.5));
    this.cap = Number(config.get('SPEAKING_AI_MONTHLY_BUDGET_USD', 1));
    this.cloud = config.get('cloudinary.cloudName', '');
    this.folder = config.get('cloudinary.folder', 'aptimate/test-covers');
    const configuredFfmpeg = config.get<string>('SPEAKING_FFMPEG_PATH', 'ffmpeg');
    const configuredFfprobe = config.get<string>('SPEAKING_FFPROBE_PATH', 'ffprobe');
    this.ffmpeg = configuredFfmpeg === 'ffmpeg' ? ffmpegPath ?? 'ffmpeg' : configuredFfmpeg;
    this.ffprobe = configuredFfprobe === 'ffprobe' ? bundledProbe.path : configuredFfprobe;
    if (this.enabled && (this.groqKey.length < 20 || this.geminiKey.length < 20 || !this.cloud || !config.get('cloudinary.enabled', false) ||
      !['FREE','PAID'].includes(this.tier) ||
      !(this.tier === 'FREE' ? flag('GEMINI_FREE_PROJECT_CONFIRMED') && !flag('GEMINI_PAID_PROJECT_CONFIRMED') : flag('GEMINI_PAID_PROJECT_CONFIRMED')) || !flag('SPEAKING_ADULT_ONLY_CONFIRMED') ||
      !flag('GROQ_FREE_TIER_CONFIRMED') || !flag('SPEAKING_AI_PRICING_VERIFIED') ||
      !Number.isFinite(this.cap) || this.cap <= 0 || this.cap > 1 ||
      !Number.isFinite(this.inputRate) || this.inputRate < .5 || !Number.isFinite(this.outputRate) || this.outputRate < 1.5)) {
      throw new Error('Speaking AI configuration invalid: keys, adult-only, confirmed Gemini tier, free Groq and verified prices are required.');
    }
    if (this.tier === 'FREE') {
      this.inputRate = 0;
      this.outputRate = 0;
    }
  }
}
