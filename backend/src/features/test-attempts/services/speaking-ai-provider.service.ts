import { Injectable, Logger } from '@nestjs/common';
import { AssessmentPaper } from '../types/attempt.type';
import { AiAssessment, SPEAKING_PROMPT_VERSION, SPEAKING_RESPONSE_SCHEMA, SPEAKING_RUBRIC, validateSpeakingAssessment } from '../assessments/speaking-ai-policy';
import { SpeakingGradingRepository, SpeakingJob } from '../repositories/speaking-grading.repository';
import { SpeakingAiConfig } from './speaking-ai-config.service';
import { SpeakingAudioService } from './speaking-audio.service';

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };
type GeminiResult = { candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } };

@Injectable()
export class SpeakingAiProvider {
  private readonly logger = new Logger(SpeakingAiProvider.name);
  private modelVerifiedUntil = 0;
  constructor(private readonly config: SpeakingAiConfig, private readonly audio: SpeakingAudioService,
    private readonly jobs: SpeakingGradingRepository) {}

  private async gemini<T>(method: string, body: unknown): Promise<T> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.config.geminiKey },
      body: JSON.stringify(body), signal: AbortSignal.timeout(90_000), redirect: 'error',
    });
    if (!response.ok) throw new Error(`GEMINI_HTTP_${response.status}`);
    return await response.json() as T;
  }

  async transcribe(job: SpeakingJob, key: string, bytes: Buffer): Promise<string> {
    if (Object.prototype.hasOwnProperty.call(job.responses, key)) return job.responses[key];
    await this.jobs.renew(job);
    const form = new FormData();
    form.set('file', new Blob([new Uint8Array(bytes)], { type: 'audio/mpeg' }), 'recording.mp3');
    form.set('model', 'whisper-large-v3');
    form.set('language', 'en');
    form.set('response_format', 'verbose_json');
    form.set('temperature', '0');
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${this.config.groqKey}` }, body: form,
      signal: AbortSignal.timeout(90_000), redirect: 'error',
    });
    if (!response.ok) throw new Error(`GROQ_HTTP_${response.status}`);
    const result = await response.json() as { text?: unknown };
    if (typeof result.text !== 'string' || result.text.length > 20_000) throw new Error('GROQ_INVALID_RESPONSE');
    await this.jobs.cache(job, key, result.text.trim());
    return result.text.trim();
  }

  async assess(job: SpeakingJob, paper: AssessmentPaper, recordings: Array<{ key: string; mediaKey: string }>): Promise<AiAssessment> {
    const keys = recordings.map(recording => recording.key);
    const expectedParts = [...new Set(paper.items.map(item => item.partNumber))];
    if (job.responses.__assessment && job.responses.__assessmentPromptVersion === SPEAKING_PROMPT_VERSION) return validateSpeakingAssessment(JSON.parse(job.responses.__assessment), keys, true, expectedParts);
    // Check inference access before downloading media or using Groq quota.
    if (Date.now() >= this.modelVerifiedUntil) {
      await this.gemini('countTokens', { contents: [{ role: 'user', parts: [{ text: 'Speaking model availability check' }] }] });
      this.modelVerifiedUntil = Date.now() + 5 * 60_000;
    }
    const parts: GeminiPart[] = [{ text: JSON.stringify({ title: paper.title, mode: paper.mode,
      partCoverage: expectedParts.map(partNumber => ({ partNumber,
        responseKeys: paper.items.filter(item => item.partNumber === partNumber).map(item => item.key),
        recordedKeys: paper.items.filter(item => item.partNumber === partNumber && keys.includes(item.key)).map(item => item.key) })),
      totalQuestions: paper.items.length, skippedKeys: paper.items.filter(item => !keys.includes(item.key)).map(item => item.key) }) }];
    let mediaBytes = 0;
    const loadedImages = new Set<number>();
    for (const recording of recordings) {
      await this.jobs.renew(job);
      const item = paper.items.find(item => item.key === recording.key)!;
      const part = paper.parts[String(item.partNumber)] as { imageUrl?: string; imageUrls?: string[]; questions?: Array<{ key?: string; text?: string }>; topic?: string };
      if (!loadedImages.has(item.partNumber)) {
        loadedImages.add(item.partNumber);
        const urls = [...(part.imageUrl ? [part.imageUrl] : []), ...(part.imageUrls ?? [])];
        for (const url of urls) {
          // Published picture tasks must include their actual image. A missing/unsupported image fails explicitly.
          const bytes = await this.audio.download(url, true);
          const mimeType = bytes.subarray(0,3).equals(Buffer.from([255,216,255])) ? 'image/jpeg'
            : bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png'
            : bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP' ? 'image/webp' : null;
          if (!mimeType) throw new Error('TASK_IMAGE_INVALID');
          mediaBytes += bytes.length;
          if (mediaBytes > 12 * 1024 * 1024) throw new Error('ASSESSMENT_MEDIA_TOO_LARGE');
          parts.push({ text: `Task image for Part ${item.partNumber}, image ${urls.indexOf(url)+1}` },
            { inlineData: { mimeType, data: bytes.toString('base64') } });
        }
      }
      const bytes = await this.audio.normalize(recording.mediaKey);
      mediaBytes += bytes.length;
      if (mediaBytes > 12 * 1024 * 1024) throw new Error('ASSESSMENT_MEDIA_TOO_LARGE');
      const transcript = await this.transcribe(job, recording.key, bytes);
      parts.push({ text: JSON.stringify({ responseKey: recording.key, partNumber: item.partNumber,
        question: item.partNumber === 4 ? { topic: part.topic, questions: part.questions } : part.questions?.find(question => question.key === item.key)?.text,
        referenceSample: item.sampleAnswer ?? null, referenceGuidance: item.explanation ?? null, whisperTranscript: transcript }) },
        { inlineData: { mimeType: 'audio/mpeg', data: bytes.toString('base64') } });
    }
    const payload = {
      systemInstruction: { parts: [{ text: SPEAKING_RUBRIC }] }, contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0, candidateCount: 1, maxOutputTokens: 16384,
        thinkingConfig: { thinkingLevel: 'minimal' }, responseMimeType: 'application/json', responseSchema: SPEAKING_RESPONSE_SCHEMA },
    };
    await this.jobs.renew(job);
    const count = await this.gemini<{ totalTokens?: number }>('countTokens', {
      generateContentRequest: { model: `models/${this.config.model}`, ...payload },
    });
    if (!Number.isSafeInteger(count.totalTokens) || count.totalTokens! <= 0 || count.totalTokens! > 100_000) throw new Error('AI_TOKEN_COUNT_INVALID');
    // Unified input rate is conservatively >= audio rate; reserve output ceiling and a 10% input margin.
    const ceiling = Math.ceil((count.totalTokens! * 1.1 * this.config.inputRate + 16384 * this.config.outputRate) / 1_000_000 * 1e8) / 1e8;
    const ledgerId = await this.jobs.reserve(job, ceiling, this.config.model, {
      promptVersion: SPEAKING_PROMPT_VERSION, billingTier: this.config.tier ?? 'PAID', policyVersion: this.config.policyVersion,
      inputRate: this.config.inputRate, outputRate: this.config.outputRate,
      countTokens: count.totalTokens, outputLimit: 16384, groqModel: 'whisper-large-v3', groqTier: 'FREE',
    }, this.config.cap);
    const budget = await this.jobs.budget();
    if (budget.used + budget.reserved >= .5) this.logger.warn(`Speaking AI budget: ${budget.used + budget.reserved >= .8 ? '80%' : '50%'} threshold reached. See admin speaking-grading/budget.`);
    // Ambiguous failures retain the entire reservation; never release spend that might have been billed.
    const response = await this.gemini<GeminiResult>('generateContent', payload);
    const usage = response.usageMetadata;
    if (usage && Number.isSafeInteger(usage.promptTokenCount) && Number.isSafeInteger(usage.candidatesTokenCount) &&
      usage.promptTokenCount! >= 0 && usage.candidatesTokenCount! >= 0 && (!usage.thoughtsTokenCount || usage.thoughtsTokenCount >= 0)) {
      const actual = (usage.promptTokenCount! * this.config.inputRate + (usage.candidatesTokenCount! + (usage.thoughtsTokenCount ?? 0)) * this.config.outputRate) / 1_000_000;
      await this.jobs.charge(ledgerId, Math.ceil(actual * 1e8) / 1e8, usage);
      if (actual > ceiling) throw new Error('AI_COST_ESTIMATE_EXCEEDED');
    } else await this.jobs.charge(ledgerId, ceiling, { estimated: true });
    const candidate = response.candidates?.[0];
    if (candidate?.finishReason !== 'STOP') throw new Error('AI_RESPONSE_INCOMPLETE');
    let decoded: unknown;
    try { decoded = JSON.parse(candidate.content?.parts?.map(part => part.text ?? '').join('') ?? ''); }
    catch { throw new Error('AI_INVALID_RESPONSE'); }
    const result = validateSpeakingAssessment(decoded, keys, true, expectedParts);
    await this.jobs.cache(job, '__assessment', JSON.stringify(result));
    await this.jobs.cache(job, '__assessmentPromptVersion', SPEAKING_PROMPT_VERSION);
    return result;
  }
}
