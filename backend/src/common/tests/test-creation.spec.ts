import { EntityManager, DataSource } from 'typeorm';
import { findCreatedTest, testCreationId } from './test-creation';
import { ReadingTestsRepository } from '../../features/reading-tests/repositories/reading-tests.repository';
import { ListeningTestsRepository } from '../../features/listening-tests/repositories/listening-tests.repository';
import { SpeakingTestsRepository } from '../../features/speaking-tests/repositories/speaking-tests.repository';
import { WritingTestsRepository } from '../../features/writing-tests/repositories/writing-tests.repository';
import { GrammarTestsRepository } from '../../features/grammar-tests/repositories/grammar-tests.repository';

describe('test creation identity', () => {
  it('is stable across retries and isolated by owner, skill and draft', () => {
    const id = testCreationId('admin-1', 'READING', 'draft-1');
    expect(testCreationId('admin-1', 'READING', 'draft-1')).toBe(id);
    expect(testCreationId('admin-2', 'READING', 'draft-1')).not.toBe(id);
    expect(testCreationId('admin-1', 'LISTENING', 'draft-1')).not.toBe(id);
    expect(testCreationId('admin-1', 'READING', 'draft-2')).not.toBe(id);
    expect(id).toMatch(/^[\da-f]{8}-[\da-f]{4}-5[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
    expect(testCreationId('a', 'READING')).not.toBe(testCreationId('a', 'READING'));
  });

  it('rejects retries against archived tests instead of recreating them', async () => {
    const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ status: 'ARCHIVED' }]);
    await expect(findCreatedTest({ query } as unknown as EntityManager, 'id', 'request')).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe.each([
  ['reading', ReadingTestsRepository], ['listening', ListeningTestsRepository], ['speaking', SpeakingTestsRepository],
  ['writing', WritingTestsRepository], ['grammar', GrammarTestsRepository],
] as const)('%s creation retries', (skill, Repository) => {
  it('returns the same id without repeating inserts, questions or audit writes', async () => {
    const rows = new Map<string, any>();
    let inserted = 0;
    let tail = Promise.resolve();
    const query = jest.fn(async (sql: string, params: any[]) => {
      if (sql.includes('pg_advisory_xact_lock')) return [];
      if (sql.startsWith('SELECT *')) return rows.has(params[0]) ? [rows.get(params[0])] : [];
      if (sql.includes('INSERT INTO tests')) {
        const id = ['writing', 'grammar'].includes(skill) ? params[7] : params[0];
        expect(id).toMatch(/^[\da-f-]{36}$/);
        expect(rows.has(id)).toBe(false);
        inserted += 1;
        const row = { id, status: 'DRAFT', version: 1 };
        rows.set(id, row);
        return [row];
      }
      return [];
    });
    // Simulate committed transaction visibility for concurrent requests.
    const dataSource = { transaction: (work: (manager: any) => Promise<any>) => {
      const pending = tail.then(() => work({ query }));
      tail = pending.then(() => {}, () => {});
      return pending;
    } } as unknown as DataSource;
    const repository: any = new Repository(dataSource);
    const test = { mode: 'part1', purpose: 'PRACTICE', details: { title: 'First draft' }, parts: {} };
    const actor = { id: 'admin-1', role: 'ADMIN' };
    repository.findAggregate = jest.fn(async (id: string) => ({ ...test, ...rows.get(id) }));
    repository.hydrate = jest.fn(async (row: any) => ({ ...test, ...row }));
    repository.buildPartContents = jest.fn(() => ({}));
    repository.toStorage = jest.fn(() => ({ partContents: {}, questions: [] }));
    repository.partContents = jest.fn(() => ({}));
    repository.toQuestions = jest.fn(() => []);
    repository.loadQuestions = repository.activeQuestions = jest.fn(async () => []);
    repository.syncQuestions = repository.upsertQuestions = jest.fn(async () => {});
    repository.audit = repository.writeAudit = jest.fn(async () => {});
    const [first, retry] = await Promise.all([
      repository.create(actor, test, {}, 'draft-1'),
      repository.create(actor, { ...test, details: { title: 'Retry' } }, {}, 'draft-1'),
    ]);
    expect(retry.id).toBe(first.id);
    expect(retry.creationReplayed).toBe(true);
    expect(inserted).toBe(1);
    expect(repository.upsertQuestions).toHaveBeenCalledTimes(1);
    expect(repository.audit).toHaveBeenCalledTimes(1);
    expect(query.mock.calls.filter(([sql]) => sql.includes('pg_advisory_xact_lock'))).toHaveLength(2);
    const secondDraft = await repository.create(actor, test, {}, 'draft-2');
    const otherOwner = await repository.create({ ...actor, id: 'admin-2' }, test, {}, 'draft-1');
    expect(secondDraft.id).not.toBe(first.id);
    expect(otherOwner.id).not.toBe(first.id);
    expect(inserted).toBe(3);
  });
});
