import 'reflect-metadata';
import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createDataSourceOptions } from '../src/database/data-source-options';
import { createGeminiServices } from '../src/features/ai-shared/create-gemini-services';
import { EmbeddingService } from '../src/features/retrieval/embedding.service';
import { AiRequestRecorder } from '../src/features/ai-shared/ai-request-recorder.service';
import { KnowledgeSearchService } from '../src/features/retrieval/knowledge-search.service';
import {
  EXPLAIN_PROMPT_VERSION,
  EXPLAIN_SYSTEM,
  explanationSchema,
  validateExplanation,
  plainText,
  ExplanationValidationError,
} from '../src/features/personalization/ai/explanation.contract';
import { AiProviderError } from '../src/features/ai-shared/ai-provider.error';
import { explanationQuery } from '../src/features/personalization/ai/explanation-context';
// Public R0 questions only: no learner attempts, account IDs, or unverified Listening answers.
async function main() {
  const root = resolve(__dirname, '..'),
    read = (p: string) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
  const gold = read('test/fixtures/rag-gold.json').samples;
  const bank = read('test/fixtures/rag-r0-review-questions.json');
  const samples = [
    ...gold.filter((s: any) => s.component === 'GRAMMAR_VOCAB'),
    ...gold
      .filter(
        (s: any) =>
          s.component === 'READING' && s.questionType !== 'READING_GAP_CHOICE',
      )
      .slice(0, 10),
  ];
  if (!process.argv.includes('--apply')) {
    console.log({ samples: samples.length, apply: false });
    return;
  }
  const dir = process.env.RAG_EVAL_OUTPUT_DIR ?? resolve(root, 'test/fixtures');
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, 'rag-r2-explanation-eval.json');
  const report: any = existsSync(file)
    ? JSON.parse(readFileSync(file, 'utf8'))
    : {
        promptVersion: EXPLAIN_PROMPT_VERSION,
        scope:
          '30 public R0 questions: 20 Grammar, 10 Reading. No learner data or audio correctness claim.',
        reviewer: null,
        results: [],
      };
  const db = await new DataSource({
    ...createDataSourceOptions(),
    logging: false,
  }).initialize();
  try {
    const config = new ConfigService(process.env),
      { client, jsonGeneration } = createGeminiServices(config, db);
    const knowledge = new KnowledgeSearchService(
      db,
      new EmbeddingService(client, new AiRequestRecorder(db)),
    );
    const provider = config.get<string>('PERSONALIZATION_PROVIDER', 'gemini'),
      model =
        config.get<string>('PERSONALIZATION_MODEL') ||
        config.get<string>('CHATBOT_MODEL', 'gemini-3.5-flash-lite');
    report.provider = provider;
    report.model = model;
    const persist = () => {
      report.updatedAt = new Date().toISOString();
      writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
    };
    for (const sample of samples) {
      const previous = report.results.find(
        (r: any) => r.id === sample.id && r.status === 'READY',
      );
      if (previous) {
        try {
          validateExplanation(
            previous.content,
            previous.locale,
            previous.context.correctAnswer,
            previous.sources.map((s: any) => s.chunkId),
            previous.context.alternatives,
          );
          continue;
        } catch (error) {
          report.rejectedExamples ??= [];
          if (
            !report.rejectedExamples.some(
              (r: any) => r.requestId === previous.requestId,
            )
          )
            report.rejectedExamples.push({
              ...previous,
              rejection:
                error instanceof ExplanationValidationError
                  ? error.issues
                  : ['INVALID'],
            });
        }
      }
      const q = bank.find((q: any) => q.id === sample.questionId),
        part =
          q.part_contents?.parts?.[String(q.part_number)] ??
          q.part_contents?.[`part${q.part_number}`] ??
          {};
      const answer = q.correct_answer;
      let correctAnswer =
        q.content.options?.[answer.optionIndex] ??
        answer.answer ??
        answer.speaker;
      if (q.question_type === 'READING_HEADING_MATCH')
        correctAnswer = part.headings?.find(
          (h: any) => h.id === answer.headingId,
        )?.text;
      if (q.question_type === 'READING_ORDER') correctAnswer = q.content.text;
      correctAnswer = plainText(correctAnswer, 300);
      if (!correctAnswer) throw Error('MISSING_ANSWER');
      const locale = Number(sample.id.split('-').at(-1)) % 2 ? 'vi' : 'en';
      const context = {
        component: q.component,
        part: q.part_number,
        question:
          q.question_type === 'READING_ORDER'
            ? `Which sentence belongs at position ${answer.position} in this sequence?`
            : plainText(q.content.text ?? q.content.statement, 1800),
        correctAnswer,
        outcome: 'INCORRECT',
        selectedAnswer:
          q.content.options?.[sample.syntheticWrongAnswer?.optionIndex] ??
          sample.syntheticWrongAnswer?.speaker ??
          '',
        alternatives: q.content.options ?? [],
        paper:
          q.question_type === 'READING_ORDER'
            ? JSON.stringify({
                sentences:
                  part.texts
                    ?.find((text: any) => text.id === q.content.textId)
                    ?.sentences?.map((s: any) => s.content) ?? [],
                openingSentence: part.texts?.find(
                  (text: any) => text.id === q.content.textId,
                )?.openingSentence,
              })
            : q.question_type === 'READING_OPINION_MATCH'
              ? JSON.stringify(
                  (part.posts ?? []).map((post: any, i: number) => ({
                    speaker: part.speakers?.[i] ?? String.fromCharCode(65 + i),
                    post,
                  })),
                )
              : '',
      };
      let chunks: any[] = [],
        content: any = null,
        requestId = null,
        status = 'FALLBACK',
        failure: string | undefined,
        issues: string[] = [];
      for (let quotaRetry = 0; quotaRetry < 4; quotaRetry++) {
        try {
          chunks = await knowledge.search(explanationQuery(context), {
            component: q.component,
            part: q.part_number,
            usage: 'LESSON',
            limit: 3,
            minSimilarity: Number(
              config.get('RAG_KNOWLEDGE_MIN_SIMILARITY', 0.7),
            ),
          });
          if (!chunks.length) {
            failure = 'NO_LESSON';
            break;
          }
          for (
            let validationRetry = 0;
            validationRetry < 2;
            validationRetry++
          ) {
            const result = await jsonGeneration.generate(
              {
                provider,
                model,
                system: EXPLAIN_SYSTEM,
                schema: explanationSchema(
                  locale,
                  correctAnswer,
                  chunks.map((c) => c.chunkId),
                ),
                temperature: 0.2,
                maxOutputTokens: 4096,
                prompt: JSON.stringify({
                  ...context,
                  locale,
                  lessons: chunks.map((c) => ({
                    chunkId: c.chunkId,
                    title: c.title,
                    content: c.content,
                  })),
                  validationErrors: issues,
                }),
                context: {
                  userId: null,
                  purpose: 'PERSONAL_EXPLAIN_EVAL',
                  promptVersion: EXPLAIN_PROMPT_VERSION,
                },
              },
              AbortSignal.timeout(60000),
            );
            requestId = result.requestId;
            try {
              let parsed;
              try {
                parsed = JSON.parse(result.text);
              } catch {
                throw new ExplanationValidationError(['INVALID_JSON']);
              }
              content = validateExplanation(
                parsed,
                locale,
                correctAnswer,
                chunks.map((c) => c.chunkId),
                context.alternatives,
              );
              status = 'READY';
              break;
            } catch (error) {
              if (!(error instanceof ExplanationValidationError)) throw error;
              issues = error.issues;
              failure = 'VALIDATION_FAILED';
            }
          }
          break;
        } catch (error) {
          failure =
            error instanceof AiProviderError ? error.reason : 'EVAL_ERROR';
          if (
            !(error instanceof AiProviderError) ||
            ![
              'QUOTA',
              'TIMEOUT',
              'UNAVAILABLE',
              'PROVIDER_503',
              'INCOMPLETE',
            ].includes(error.reason) ||
            quotaRetry === 3
          )
            break;
          const wait =
            error.reason === 'QUOTA'
              ? Math.max(60000, error.retryAfterMs ?? 0)
              : 15000;
          persist();
          console.log(JSON.stringify({ sample: sample.id, waitingMs: wait }));
          if (wait > 120000) break;
          await new Promise((r) => setTimeout(r, wait));
        }
      }
      report.results = report.results.filter((r: any) => r.id !== sample.id);
      report.results.push({
        id: sample.id,
        locale,
        context,
        status,
        content,
        requestId,
        failure: status === 'READY' ? undefined : failure,
        sources: chunks.map((c) => ({
          chunkId: c.chunkId,
          title: c.title,
          content: c.content,
        })),
        review: null,
      });
      persist();
      console.log(
        JSON.stringify({
          sample: sample.id,
          status,
          failure: status === 'READY' ? undefined : failure,
        }),
      );
      if (failure === 'QUOTA' && status !== 'READY') break;
    }
    report.complete =
      report.results.length === 30 &&
      report.results.every((r: any) => r.status === 'READY');
    persist();
    if (!report.complete) process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}
main().catch((e) => {
  console.error('R2 evaluation stopped:', e.code ?? e.name);
  process.exitCode = 1;
});
