import 'reflect-metadata';
import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createDataSourceOptions } from '../src/database/data-source-options';
import { createGeminiServices } from '../src/features/ai-shared/create-gemini-services';
import { AiRequestRecorder } from '../src/features/ai-shared/ai-request-recorder.service';
import {
  EmbeddingService,
  EMBEDDING_MODEL,
  normalizeEmbedding,
} from '../src/features/retrieval/embedding.service';
import { KnowledgeSearchService } from '../src/features/retrieval/knowledge-search.service';
import {
  knowledgeWhere,
  reciprocalRankFusion,
} from '../src/features/retrieval/hybrid-search';
import { buildQuestionText } from '../src/features/retrieval/question-text';

const root = resolve(__dirname, '..');
const outputDir =
  process.env.RAG_BASELINE_OUTPUT_DIR ?? resolve(root, 'test/fixtures');
const read = (file: string) =>
  JSON.parse(readFileSync(resolve(root, file), 'utf8'));
const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
function withoutLabels(value: any): any {
  if (Array.isArray(value)) return value.map(withoutLabels);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !/(answer|explanation|correct|audio|url)/i.test(key))
        .map(([key, v]) => [key, withoutLabels(v)]),
    );
  return value;
}
async function main() {
  mkdirSync(outputDir, { recursive: true });
  const labels = read('test/fixtures/rag-r1-baseline-labels.json');
  const source = read('test/fixtures/rag-gold.json');
  const questions = read('test/fixtures/rag-r0-review-questions.json');
  const corpus = read('resources/chatbot-knowledge/corpus.json');
  const samples = labels.samples.map((label: any) => {
    const original = source.samples.find((s: any) => s.id === label.id);
    const q = questions.find((q: any) => q.id === original?.questionId);
    if (!q || !corpus.some((d: any) => d.key === label.documentKey))
      throw Error('INVALID_BASELINE_LABEL');
    const query = buildQuestionText({
      ...q,
      content: withoutLabels(q.content),
      part_contents: withoutLabels(q.part_contents),
      correct_answer: undefined,
      sample_answer: undefined,
      explanation: undefined,
    });
    return {
      ...label,
      component: q.component,
      query,
      cacheKey: hash({
        query,
        model: EMBEDDING_MODEL,
        task: 'RETRIEVAL_QUERY',
      }),
    };
  });
  const cachePath = resolve(outputDir, 'rag-r1-query-vectors.local.json');
  const cache: Record<string, number[]> = existsSync(cachePath)
    ? JSON.parse(readFileSync(cachePath, 'utf8'))
    : {};
  const db = await new DataSource({
    ...createDataSourceOptions(),
    logging: false,
  }).initialize();
  let providerFailure: string | undefined;
  try {
    const { client } = createGeminiServices(new ConfigService(process.env), db);
    const embedding = new EmbeddingService(client, new AiRequestRecorder(db));
    if (process.argv.includes('--embed')) {
      const missing = samples.filter((s: any) => !cache[s.cacheKey]);
      for (let i = 0; i < missing.length; i += 20) {
        const batch = missing.slice(i, i + 20);
        try {
          const vectors = await embedding.embedMany(
            batch.map((s: any) => s.query),
            AbortSignal.timeout(60000),
            undefined,
            true,
          );
          batch.forEach(
            (s: any, j: number) => (cache[s.cacheKey] = vectors[j]),
          );
          writeFileSync(cachePath, JSON.stringify(cache));
        } catch (error) {
          providerFailure = (error as any).reason ?? 'EMBEDDING_FAILED';
          break;
        }
      }
    }
    const search = new KnowledgeSearchService(db, embedding);
    const results: {
      id: string;
      component: string;
      family: string;
      keyword: number;
      vector: number | null;
      hybrid: number | null;
    }[] = [];
    for (const sample of samples) {
      const args: unknown[] = [sample.query];
      const where = knowledgeWhere({ usage: 'LESSON' }, args);
      const keyword = await db.query(
        `SELECT c.id,d.document_key AS "documentKey" FROM knowledge_chunks c JOIN knowledge_documents d ON d.id=c.document_id
        WHERE ${where} AND c.search_vector @@ plainto_tsquery('simple',$1) ORDER BY ts_rank_cd(c.search_vector,plainto_tsquery('simple',$1)) DESC,c.id LIMIT 10`,
        args,
      );
      const hit = (rows: any[]) =>
        rows.slice(0, 5).some((r) => r.documentKey === sample.documentKey)
          ? 1
          : 0;
      let vector: number | null = null,
        hybrid: number | null = null;
      if (cache[sample.cacheKey]) {
        const branches = await search.searchBranches(
          normalizeEmbedding(cache[sample.cacheKey]),
          sample.query,
          { usage: 'LESSON', limit: 5 },
        );
        vector = hit(branches.semantic);
        hybrid = hit(
          reciprocalRankFusion([branches.semantic, branches.lexical], 5),
        );
      }
      results.push({
        id: sample.id,
        component: sample.component,
        family: sample.family,
        keyword: hit(keyword),
        vector,
        hybrid,
      });
    }
    const summary = (rows: any[]) =>
      Object.fromEntries(
        ['keyword', 'vector', 'hybrid'].map((mode) => {
          const eligible = rows.filter((r) => r[mode] !== null);
          const groups = [...new Set(eligible.map((r) => r.family))];
          return [
            mode,
            {
              evaluated: eligible.length,
              recallAt5: eligible.length
                ? eligible.reduce((sum, r) => sum + r[mode], 0) /
                  eligible.length
                : null,
              familyMacroRecallAt5: groups.length
                ? groups.reduce((sum, f) => {
                    const group = eligible.filter((r) => r.family === f);
                    return (
                      sum +
                      group.reduce((n, r) => n + r[mode], 0) / group.length
                    );
                  }, 0) / groups.length
                : null,
            },
          ];
        }),
      );
    const complete = results.every((r) => r.vector !== null);
    const report = {
      status: complete
        ? 'COMPLETE_AI_REVIEWED_KNOWLEDGE_BASELINE'
        : 'INCOMPLETE_QUERY_EMBEDDINGS',
      generatedAt: new Date().toISOString(),
      model: EMBEDDING_MODEL,
      corpusHash: hash(corpus),
      labelsHash: hash(labels),
      scope: labels.scope,
      limitations: labels.limitations,
      providerFailure,
      summary: summary(results),
      byComponent: Object.fromEntries(
        ['GRAMMAR_VOCAB', 'READING', 'LISTENING'].map((c) => [
          c,
          summary(results.filter((r) => r.component === c)),
        ]),
      ),
      results,
    };
    writeFileSync(
      resolve(outputDir, 'rag-r1-baseline-results.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(
      JSON.stringify(
        { status: report.status, providerFailure, summary: report.summary },
        null,
        2,
      ),
    );
    if (!complete) process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}
main().catch((error) => {
  console.error(
    'RAG baseline failed; verify fixtures, migrations and database.',
    error.code ?? error.name,
  );
  process.exitCode = 1;
});
