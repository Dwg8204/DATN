import { DataSource } from 'typeorm';
import { SpeakingGradingRepository, SpeakingJob } from './speaking-grading.repository';
const job: SpeakingJob = { attempt_id: 'attempt', lease_token: 'lease', failures: 1, responses: {} };
describe('Speaking AI budget reservations', () => {
  it('queues transient failures using provider delay but stops after the third run', async () => {
    const query = jest.fn(async () => [{ attempt_id: 'attempt' }]);
    const db = { transaction: async (fn: (manager: { query: typeof query }) => Promise<unknown>) => fn({ query }) };
    const repository = new SpeakingGradingRepository(db as unknown as DataSource);
    await repository.fail(job, 'GEMINI_HTTP_503', true, 'Retrying', 120000);
    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('$6::double precision'),
      ['attempt', 'lease', 'QUEUED', false, 'GEMINI_HTTP_503', 120000]);
    query.mockClear();
    await repository.fail({ ...job, failures: 3 }, 'GEMINI_HTTP_503', true, 'Failed');
    expect(query.mock.calls[0]).toEqual([expect.any(String), expect.arrayContaining(['FAILED'])]);
  });
  it('does not reuse consent from another billing policy', async () => {
    const query = jest.fn(async (sql: string) => sql.includes('SELECT id FROM test_attempts') ? [{ id: 'attempt' }] : []);
    const db = { transaction: async (fn: (manager: { query: typeof query }) => Promise<unknown>) => fn({ query }) };
    const repository = new SpeakingGradingRepository(db as unknown as DataSource);
    await expect(repository.consent('attempt', 'owner', 'speaking-ai-free-v2', false)).resolves.toBeNull();
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining('policy_version=$2'), ['attempt', 'speaking-ai-free-v2']);
  });
  it('restricts existing jobs and newly queued jobs to the current consent policy', async () => {
    const query = jest.fn(async () => []);
    const db = { transaction: async (fn: (manager: { query: typeof query }) => Promise<unknown>) => fn({ query }) };
    const repository = new SpeakingGradingRepository(db as unknown as DataSource);
    await expect(repository.claim('speaking-ai-free-v2')).resolves.toBeNull();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('AND c.policy_version=$1 ON CONFLICT'), ['speaking-ai-free-v2']);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('AND EXISTS(SELECT 1 FROM speaking_ai_consents'), ['speaking-ai-free-v2']);
  });
  function fixture(total: number) {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT attempt_id')) return [{ attempt_id: 'attempt' }];
      if (sql.includes('AS total')) return [{ total }];
      if (sql.includes('INSERT INTO speaking_ai_costs')) return [[{ id: 'ledger' }],1];
      return [];
    });
    const db = { transaction: async (fn: (manager: { query: typeof query }) => Promise<unknown>) => fn({ query }) };
    return { repository: new SpeakingGradingRepository(db as unknown as DataSource), query };
  }
  it('rejects a request before dispatch if used + reserved + ceiling exceeds cap', async () => {
    const { repository, query } = fixture(.99);
    await expect(repository.reserve(job,.02,'model',{},1)).rejects.toMatchObject({ code: 'SPEAKING_BUDGET_EXCEEDED' });
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO speaking_ai_costs'))).toBe(false);
    expect(query.mock.calls[0][0]).toContain('pg_advisory_xact_lock');
  });
  it('persists a reservation under the transaction lock', async () => {
    const { repository, query } = fixture(.2);
    await expect(repository.reserve(job,.02,'model',{ promptVersion: 'v1' },1)).resolves.toBe('ledger');
    expect(query.mock.calls.some(([sql]) => sql.includes('config_snapshot'))).toBe(true);
  });
});
