import 'reflect-metadata';
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { GeminiProvider } from '../src/common/ai/providers/gemini.provider';
import { WritingAiConfig } from '../src/features/writing-assessment/writing-ai-config.service';
import { AiError } from '../src/common/ai/ai-error';

async function main() {
  const configService = new ConfigService(process.env);
  const config = new WritingAiConfig(configService);
  config.assertReady();
  const job = config.snapshot('vi');
  const started = Date.now();
  const result = await new GeminiProvider(configService).generateStructured({
    model: job.model,
    systemInstruction:
      'Return JSON only. Correct the grammatical error in the given English sentence. Do not add commentary.',
    input: { sentence: 'Yesterday I go to the library.' },
    maxOutputTokens: 512,
    signal: AbortSignal.timeout(job.timeoutMs),
    outputSchema: {
      type: 'object',
      properties: { corrected: { type: 'string', maxLength: 200 } },
      required: ['corrected'],
    },
  });
  if (
    !result ||
    typeof result !== 'object' ||
    typeof (result as { corrected?: unknown }).corrected !== 'string'
  )
    throw new AiError('AI_INVALID_RESPONSE');
  console.log(JSON.stringify({ status: 'OK', model: job.model, elapsedMs: Date.now() - started }));
}
main().catch((error) => {
  console.error(error instanceof AiError ? error.code : 'WRITING_SMOKE_CONFIGURATION_OR_CONNECTION_FAILED');
  process.exitCode = 1;
});
