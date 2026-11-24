import { buildQuestionText, QUESTION_TYPES } from './question-text';
import { EmbeddingService, normalizeEmbedding } from './embedding.service';
import { reciprocalRankFusion, knowledgeWhere } from './hybrid-search';
import {
  importableDocument,
  sectionsHash,
  validateCorpus,
} from './knowledge-corpus';
import { KnowledgeSearchService } from './knowledge-search.service';
import { QuestionEmbeddingWorker } from './question-embedding.worker';
import { ConfigService } from '@nestjs/config';
import { AiProviderError } from '../ai-shared/ai-provider.error';

describe('RAG foundation', () => {
  test('quota pauses the worker without consuming retries or touching other jobs', async () => {
    const queries: { sql: string; args?: unknown[] }[] = [];
    const manager = {
      query: jest.fn(async (sql: string, args?: unknown[]) => {
        queries.push({ sql, args });
        if (sql.includes('SELECT * FROM question_embedding_jobs'))
          return [{ test_id: 'test', retry_count: 0 }];
        if (sql.includes('SELECT published_snapshot_id'))
          return [{ status: 'PUBLISHED', published_snapshot_id: 'snapshot' }];
        if (sql.includes('SELECT q.*'))
          return [
            {
              id: 'question',
              question_type: 'GRAMMAR_MULTIPLE_CHOICE',
              component: 'GRAMMAR_VOCAB',
              part_number: 1,
              content: { text: 'Example' },
            },
          ];
        return [];
      }),
    };
    const db = {
      transaction: jest.fn(async (callback: any) => callback(manager)),
    };
    const worker = new QuestionEmbeddingWorker(
      db as any,
      {
        embedMany: async () => {
          throw new AiProviderError('QUOTA', 120000);
        },
      } as any,
      new ConfigService({ PERSONALIZATION_RAG_ENABLED: true }),
    );
    await worker.runBatch();
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(worker.retryAfterMs).toBeGreaterThan(110000);
    expect(
      queries.find((q) => q.sql.includes('retry_count=retry_count'))?.args?.[1],
    ).toBe(0);
    await worker.runBatch();
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });
  test.each(QUESTION_TYPES)(
    'formats %s without media or HTML',
    (question_type) => {
      const text = buildQuestionText({
        question_type,
        component: 'READING',
        part_number: 1,
        question_key: 'p1:q1',
        content: { text: '<b>Choose</b>', audioUrl: 'https://private.invalid' },
        correct_answer: { answer: 'on' },
        part_contents: { parts: { 1: { text: 'Meet on Monday' } } },
      });
      expect(text).toContain('Choose');
      expect(text).toContain('on');
      expect(text).not.toMatch(/private|<b>|audioUrl/);
      expect(text.length).toBeLessThanOrEqual(2000);
    },
  );
  test('matching uses the correct group and gap keeps its passage', () => {
    const base = {
      question_type: 'VOCABULARY_MATCHING',
      component: 'GRAMMAR_VOCAB',
      part_number: 2,
      question_key: 'p2:q1',
      group_key: 'b',
      content: { word: 'venue' },
      part_contents: {
        sets: [
          { groupKey: 'a', options: ['wrong group'] },
          { groupKey: 'b', options: ['place for an event'] },
        ],
      },
    };
    expect(buildQuestionText(base)).toContain('place for an event');
    expect(buildQuestionText(base)).not.toContain('wrong group');
    expect(
      buildQuestionText({
        ...base,
        question_type: 'READING_GAP_CHOICE',
        part_number: 1,
        part_contents: { parts: { 1: { text: 'We meet ___ Monday' } } },
      }),
    ).toContain('We meet ___ Monday');
    expect(() =>
      buildQuestionText({ ...base, question_type: 'UNKNOWN' }),
    ).toThrow('UNSUPPORTED');
  });
  test('RRF deduplicates each input list and combines branches', () => {
    expect(
      reciprocalRankFusion([
        [{ id: 'a' }, { id: 'b' }],
        [{ id: 'b' }, { id: 'c' }],
      ])[0].id,
    ).toBe('b');
    expect(
      reciprocalRankFusion([[{ id: 'a' }, { id: 'a' }], [{ id: 'b' }]]),
    ).toHaveLength(2);
  });
  test('filters are parameterized and retain ownership/version visibility constraints', () => {
    const args: unknown[] = [];
    const sql = knowledgeWhere(
      {
        component: "READING'; DROP TABLE users;--",
        part: 2,
        topicCodes: ['reading-detail'],
        usage: 'LESSON',
        criterion: 'TASK',
      },
      args,
    );
    expect(sql).not.toContain('DROP');
    expect(sql).toContain('access_scope');
    expect(sql).toContain('newer.version_no');
    expect(args).toHaveLength(5);
  });
  test('embedding batch is bounded, normalized, and recorded', async () => {
    const client = {
      request: jest.fn(async (_m, _method, body) => ({
        embeddings: body.requests.map(() => ({ values: Array(768).fill(1) })),
      })),
    };
    const recorder = {
      start: jest.fn(async () => 'request'),
      complete: jest.fn(),
      fail: jest.fn(),
    };
    const service = new EmbeddingService(client as any, recorder as any);
    const result = await service.embedMany(
      Array(21).fill('test'),
      new AbortController().signal,
    );
    expect(client.request).toHaveBeenCalledTimes(2);
    expect(recorder.complete).toHaveBeenCalledTimes(2);
    expect(Math.hypot(...result[0])).toBeCloseTo(1);
    expect(() => normalizeEmbedding(Array(768).fill(0))).toThrow();
    expect(() => normalizeEmbedding([1])).toThrow();
    expect(() =>
      normalizeEmbedding(Array(768).fill(Number.MAX_VALUE)),
    ).toThrow();
  });
  test('empty store avoids a provider call', async () => {
    const embeddings = { embed: jest.fn() };
    const service = new KnowledgeSearchService(
      { query: async () => [{ count: 0 }] } as any,
      embeddings as any,
    );
    expect(await service.search('test')).toEqual([]);
    expect(embeddings.embed).not.toHaveBeenCalled();
  });
  test('disabled worker never touches database', async () => {
    const db = { transaction: jest.fn() };
    await new QuestionEmbeddingWorker(
      db as any,
      {} as any,
      new ConfigService({ PERSONALIZATION_RAG_ENABLED: false }),
    ).runBatch();
    expect(db.transaction).not.toHaveBeenCalled();
  });
  test('only reviewed content may be imported and editing invalidates review', () => {
    const doc: any = {
      key: 'test',
      title: 'Test',
      variant: 'ENGLISH',
      source: null,
      verifiedAt: '2026-11-10',
      usage: 'LESSON',
      topicCodes: ['articles'],
      sections: [{ heading: 'Rule', text: 'An example' }],
      reviewStatus: 'DRAFT',
    };
    expect(importableDocument(doc)).toBe(false);
    doc.reviewStatus = 'AI_APPROVED';
    doc.review = { contentHash: sectionsHash(doc) };
    validateCorpus([doc]);
    expect(importableDocument(doc)).toBe(true);
    doc.sections[0].text = 'Changed';
    expect(importableDocument(doc)).toBe(false);
    expect(() => validateCorpus([doc])).toThrow('STALE_AI_REVIEW');
  });
});
