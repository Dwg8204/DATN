import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeedbackLocale } from './contracts/writing-assessment-output';

export type WritingJobConfig = {
  provider: string;
  model: string;
  timeoutMs: number;
  maxOutputTokens: number;
  maxAttempts: number;
  feedbackLocale: FeedbackLocale;
  rubricVersion: string;
  promptVersion: string;
  schemaVersion: 1;
  inputVersion?: 1 | 2;
  assessmentMode?: 'PARTS_V1';
};

@Injectable()
export class WritingAiConfig {
  readonly enabled: boolean;
  readonly minIntervalMs: number;
  constructor(private readonly config: ConfigService) {
    this.enabled = String(config.get('WRITING_AI_ENABLED', false)) === 'true';
    this.minIntervalMs = Number(config.get('WRITING_AI_MIN_INTERVAL_MS', 15000));
    if (this.enabled) this.assertReady();
  }
  assertReady(): void {
    if (
      this.config.get('WRITING_AI_PROVIDER', 'gemini') !== 'gemini' ||
      this.config.get<string>('GEMINI_API_KEY', '').length < 20 ||
      this.config.get('GEMINI_BILLING_TIER', 'PAID') !== 'FREE' ||
      String(this.config.get('GEMINI_FREE_PROJECT_CONFIRMED', false)) !== 'true' ||
      String(this.config.get('GEMINI_PAID_PROJECT_CONFIRMED', false)) === 'true'
    ) {
      throw new Error(
        'Writing AI requires a Gemini key and a confirmed FREE project. Existing Speaking settings must be preserved.',
      );
    }
  }
  snapshot(_feedbackLocale: FeedbackLocale): WritingJobConfig {
    return {
      provider: this.config.get('WRITING_AI_PROVIDER', 'gemini'),
      model: this.config.get('WRITING_AI_MODEL', 'gemini-3.5-flash-lite'),
      timeoutMs: Number(this.config.get('WRITING_AI_REQUEST_TIMEOUT_MS', 60000)),
      maxOutputTokens: Number(this.config.get('WRITING_AI_MAX_OUTPUT_TOKENS', 8192)),
      maxAttempts: Number(this.config.get('WRITING_AI_MAX_ATTEMPTS', 3)),
      feedbackLocale: 'vi',
      rubricVersion: 'writing-rubric-v2',
      promptVersion: 'writing-prompt-v4-evidence-ids',
      inputVersion: 2,
      schemaVersion: 1,
      assessmentMode: 'PARTS_V1',
    };
  }
}
