import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createDataSourceOptions } from '../src/database/data-source-options';
import { createGeminiServices } from '../src/features/ai-shared/create-gemini-services';
import { AiRequestRecorder } from '../src/features/ai-shared/ai-request-recorder.service';
import { EmbeddingService } from '../src/features/retrieval/embedding.service';
import { QuestionEmbeddingWorker } from '../src/features/retrieval/question-embedding.worker';
async function main() {
  if (process.env.PERSONALIZATION_RAG_ENABLED !== 'true')
    throw Error('RAG_DISABLED');
  const db = await new DataSource({
    ...createDataSourceOptions(),
    logging: false,
  }).initialize();
  try {
    const config = new ConfigService(process.env),
      { client } = createGeminiServices(config, db);
    const worker = new QuestionEmbeddingWorker(
      db,
      new EmbeddingService(client, new AiRequestRecorder(db)),
      config,
    );
    const deadline = Date.now() + 30 * 60000;
    do {
      await worker.runBatch();
      const [state] =
        await db.query(`SELECT count(*) FILTER(WHERE completed_at IS NULL AND retry_count<5)::int pending,
    count(*) FILTER(WHERE completed_at IS NULL AND retry_count>=5)::int failed,count(*) FILTER(WHERE completed_at IS NOT NULL)::int completed,
    COALESCE(EXTRACT(EPOCH FROM min(next_retry_at) FILTER(WHERE completed_at IS NULL AND retry_count<5)-now())*1000,0)::float wait_ms
    FROM question_embedding_jobs`);
      console.log(JSON.stringify(state));
      if (!state.pending) {
        if (state.failed) process.exitCode = 1;
        break;
      }
      if (!process.argv.includes('--drain')) break;
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          Math.min(60000, Math.max(1000, state.wait_ms, worker.retryAfterMs)),
        ),
      );
    } while (Date.now() < deadline);
    if (Date.now() >= deadline) throw Error('DRAIN_TIME_LIMIT');
  } finally {
    await db.destroy();
  }
}
main().catch((error) => {
  console.error(
    'Embedding worker stopped:',
    error.message?.startsWith('AI_') ? error.message : error.name,
  );
  process.exitCode = 1;
});
