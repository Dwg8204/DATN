import { ConfigService } from '@nestjs/config';
import { MistakeExplanationService } from './mistake-explanation.service';
const actor: any = { id: 'student', role: 'STUDENT' };
function fixture(overrides: any = {}) {
  const attempt = {
    id: 'attempt',
    purpose: 'PRACTICE',
    component: 'READING',
    assessment_revision: 1,
    snapshot_id: 'snapshot',
  };
  const item = {
    key: 'p1:q1',
    correctAnswer: 'a',
    explanation: 'On đi với ngày trong tuần.',
    outcome: { outcome: overrides.outcome ?? 'INCORRECT' },
    selectedAnswer: { optionId: 'b' },
  };
  const detail = {
    component: 'READING',
    partNumber: 1,
    paper: {
      passage: 'Meet ___ Monday',
      questions: [
        {
          key: 'p1:q1',
          text: 'Choose',
          options: [
            { id: 'a', text: 'on' },
            { id: 'b', text: 'at' },
          ],
        },
      ],
    },
    items: [item],
  };
  const chunks = [
    {
      chunkId: 'chunk',
      title: 'Prepositions',
      content: 'Use on with weekdays.',
    },
  ];
  const query = jest.fn(async (sql: string, args: any[] = []) => {
    if (sql.includes('SELECT id,purpose'))
      return overrides.missing ? [] : [attempt];
    if (sql.includes('SELECT * FROM mistake_explanations'))
      return overrides.cache ? [overrides.cache] : [];
    if (sql.includes('SELECT calls FROM mistake_explanation_usage'))
      return [{ calls: overrides.limit ? 50 : 0 }];
    if (sql.includes('INSERT INTO mistake_explanation_usage'))
      return [{ calls: 1 }];
    if (sql.includes('SELECT sq.question_id'))
      return [{ question_id: 'question', topic_codes: [] }];
    if (sql.includes('SELECT c.id AS'))
      return overrides.retired
        ? []
        : [
            {
              chunkId: 'chunk',
              title: 'Prepositions',
              excerpt: 'Use on with weekdays.',
              url: 'https://example.org/lesson',
            },
          ];
    if (sql.includes('SELECT id FROM test_attempts'))
      return overrides.revised ? [] : [{ id: 'attempt' }];
    return [];
  });
  const db: any = { query, transaction: async (fn: any) => fn({ query }) };
  const mistakes: any = { details: jest.fn(async () => detail) };
  const knowledge: any = {
    search: jest.fn(async () => (overrides.noLesson ? [] : chunks)),
  };
  const generation: any = {
    generate: jest.fn(async () => ({
      requestId: 'request',
      text: JSON.stringify({
        locale: 'vi',
        correctAnswer: 'on',
        explanation: 'Dùng on trước ngày trong tuần.',
        ruleSummary: 'On đi với ngày.',
        tip: 'Nhớ on Monday.',
        citations: ['chunk'],
      }),
    })),
  };
  const service = new MistakeExplanationService(
    db,
    new ConfigService({ PERSONALIZATION_RAG_ENABLED: !overrides.disabled }),
    mistakes,
    knowledge,
    generation,
  );
  return { service, query, generation, knowledge, mistakes, attempt };
}
describe('Mistake explanations', () => {
  test('skipped questions may receive an explanation', async () => {
    const f = fixture({ outcome: 'SKIPPED' });
    expect(
      (await f.service.explain(actor, 'attempt', 'p1:q1', 'vi')).status,
    ).toBe('READY');
  });
  test('retired cached sources are not returned', async () => {
    const f = fixture({
      retired: true,
      cache: {
        status: 'READY',
        chunk_ids: ['chunk'],
        content: { explanation: 'Retired source' },
      },
    });
    const result = await f.service.explain(actor, 'attempt', 'p1:q1', 'vi');
    expect(result.status).toBe('FALLBACK');
    expect(result.sources).toEqual([]);
    expect(result.explanation).not.toBe('Retired source');
  });
  test('rejects missing/unowned attempts before reading details or cache', async () => {
    const f = fixture({ missing: true });
    await expect(
      f.service.explain(actor, 'attempt', 'p1:q1', 'vi'),
    ).rejects.toMatchObject({ code: 'MISTAKE_SOURCE_UNAVAILABLE' });
    expect(f.mistakes.details).not.toHaveBeenCalled();
  });
  test('rejects correct questions', async () => {
    const f = fixture({ outcome: 'CORRECT' });
    await expect(
      f.service.explain(actor, 'attempt', 'p1:q1', 'vi'),
    ).rejects.toMatchObject({ code: 'MISTAKE_QUESTION_NOT_INCORRECT' });
    expect(f.generation.generate).not.toHaveBeenCalled();
  });
  test('feature off does no database or AI work', async () => {
    const f = fixture({ disabled: true });
    await expect(
      f.service.explain(actor, 'attempt', 'p1:q1', 'vi'),
    ).rejects.toThrow();
    expect(f.query).not.toHaveBeenCalled();
  });
  test('cache hit remains readable at quota and avoids all AI', async () => {
    const f = fixture({
      limit: true,
      cache: {
        status: 'READY',
        chunk_ids: ['chunk'],
        content: { explanation: 'Saved' },
      },
    });
    expect(
      (await f.service.explain(actor, 'attempt', 'p1:q1', 'vi')).explanation,
    ).toBe('Saved');
    expect(f.knowledge.search).not.toHaveBeenCalled();
    expect(f.generation.generate).not.toHaveBeenCalled();
  });
  test('no lesson falls back, records only gap metadata and no generation', async () => {
    const f = fixture({ noLesson: true });
    expect(
      (await f.service.explain(actor, 'attempt', 'p1:q1', 'vi')).notice,
    ).toBe('NO_LESSON');
    expect(
      f.query.mock.calls.some(([sql]) =>
        sql.includes('INSERT INTO retrieval_gaps'),
      ),
    ).toBe(true);
    expect(f.generation.generate).not.toHaveBeenCalled();
  });
  test('quota falls back before query embedding and is not cached', async () => {
    const f = fixture({ limit: true });
    expect(
      (await f.service.explain(actor, 'attempt', 'p1:q1', 'vi')).notice,
    ).toBe('EXPLAIN_LIMIT_REACHED');
    expect(f.knowledge.search).not.toHaveBeenCalled();
    expect(
      f.query.mock.calls.some(([sql]) =>
        sql.includes('INSERT INTO mistake_explanations'),
      ),
    ).toBe(false);
  });
  test('READY returns only retrieved citations and records request ID', async () => {
    const f = fixture();
    const result = await f.service.explain(actor, 'attempt', 'p1:q1', 'vi');
    expect(result.status).toBe('READY');
    expect(result.sources.map((s: any) => s.chunkId)).toEqual(['chunk']);
    expect(
      f.query.mock.calls.find(([sql]) =>
        sql.includes('INSERT INTO mistake_explanations'),
      )?.[1],
    ).toContain('request');
  });
  test('invalid citation retries once then falls back without citations', async () => {
    const f = fixture();
    f.generation.generate.mockResolvedValue({
      requestId: 'request',
      text: '{"citations":["invented"]}',
    });
    const result = await f.service.explain(actor, 'attempt', 'p1:q1', 'vi');
    expect(result.status).toBe('FALLBACK');
    expect(result.sources).toEqual([]);
    expect(f.generation.generate).toHaveBeenCalledTimes(2);
    expect(f.generation.generate.mock.calls[1][0].prompt).toContain(
      'validationErrors',
    );
  });
  test('revised result is never cached or returned', async () => {
    const f = fixture({ revised: true });
    await expect(
      f.service.explain(actor, 'attempt', 'p1:q1', 'vi'),
    ).rejects.toMatchObject({ code: 'MISTAKE_SOURCE_UNAVAILABLE' });
    expect(
      f.query.mock.calls.some(([sql]) =>
        sql.includes('INSERT INTO mistake_explanations'),
      ),
    ).toBe(false);
  });
  test('concurrent opens share generation within a process', async () => {
    const f = fixture();
    await Promise.all([
      f.service.explain(actor, 'attempt', 'p1:q1', 'vi'),
      f.service.explain(actor, 'attempt', 'p1:q1', 'vi'),
    ]);
    expect(f.generation.generate).toHaveBeenCalledTimes(1);
  });
});
