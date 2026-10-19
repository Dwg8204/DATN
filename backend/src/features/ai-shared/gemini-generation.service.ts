import { Injectable } from '@nestjs/common';
import { AiProviderError, toAiProviderError } from './ai-provider.error';
import { AiRequestRecorder } from './ai-request-recorder.service';
import { GeminiClient } from './gemini-client.service';
import { GeminiGenerationInput } from './gemini.types';

@Injectable()
export class GeminiGenerationService {
  constructor(
    private readonly client: GeminiClient,
    private readonly recorder: AiRequestRecorder,
  ) {}

  async generate(input: GeminiGenerationInput, signal: AbortSignal) {
    this.client.assertReady(input.model);
    const request = {
      systemInstruction: { parts: [{ text: input.system }] },
      contents: input.contents,
      ...(input.tools?.length
        ? { tools: [{ functionDeclarations: input.tools }] }
        : {}),
      generationConfig: {
        temperature: input.temperature ?? 0.2,
        maxOutputTokens: input.maxOutputTokens ?? 4096,
        responseMimeType: 'application/json',
        responseSchema: input.responseSchema,
      },
    };
    const requestId = await this.recorder.start(input, request);
    try {
      const body = await this.client.request(
        input.model,
        'generateContent',
        request,
        signal,
      );
      signal.throwIfAborted();
      const candidate = body.candidates?.[0];
      if (
        body.promptFeedback?.blockReason ||
        candidate?.finishReason === 'SAFETY'
      ) {
        throw new AiProviderError('SAFETY');
      }
      if (
        !candidate?.content?.parts?.length ||
        candidate.finishReason !== 'STOP'
      ) {
        throw new AiProviderError('INCOMPLETE');
      }
      const usage = body.usageMetadata ?? {};
      await this.recorder.complete(requestId, usage);
      // Do not reconstruct parts: Gemini needs opaque thought signatures and call IDs on subsequent turns.
      return { requestId, content: candidate.content, usage };
    } catch (error) {
      const failure = toAiProviderError(error, signal);
      await this.recorder.fail(
        requestId,
        `${input.context.errorCodePrefix ?? 'AI'}_${failure.reason}`,
      );
      throw failure;
    }
  }
}
