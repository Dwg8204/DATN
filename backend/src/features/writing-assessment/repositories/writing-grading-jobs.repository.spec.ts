import { WritingGradingJobsRepository, WritingJob } from './writing-grading-jobs.repository';
import { writingInputHash } from './writing-grading-jobs.repository';
import { writingFixture } from '../testing/writing.fixture';
import { WritingAiConfig } from '../writing-ai-config.service';
import { ConfigService } from '@nestjs/config';

describe('Writing checkpoint lease ownership', () => {
  const job = { id: 'job', attempt_id: 'attempt', assessment_revision: 1, lease_token: 'lease',
    config_snapshot: { timeoutMs: 60000 } } as WritingJob;
  function setup(attempt: boolean, lease: boolean) {
    const query = jest.fn(async (sql: string) => {
      if (sql.startsWith('SELECT id FROM test_attempts')) return attempt ? [{ id: job.attempt_id }] : [];
      if (sql.startsWith('SELECT id FROM writing_grading_jobs')) return lease ? [{ id: job.id }] : [];
      return [];
    });
    const repository = new WritingGradingJobsRepository({ transaction: async (fn: any) => fn({ query }) } as any);
    return { query, repository };
  }
  it('renews an owned lease without changing the immutable config or learner result', async () => {
    const h = setup(true, true);
    await h.repository.checkpoint(job);
    expect(h.query).toHaveBeenLastCalledWith(expect.stringContaining('stage_results=COALESCE'), ['job', 120000, null]);
    const writes = h.query.mock.calls.map(([sql]) => sql).filter(sql => sql.startsWith('UPDATE'));
    expect(writes).toHaveLength(1);
    expect(writes[0]).not.toMatch(/config_snapshot\s*=|UPDATE test_attempts/);
  });
  it.each([[false, false], [true, false]])('rejects stale attempt/lease ownership %s %s', async (attempt, lease) => {
    const h = setup(attempt, lease);
    await expect(h.repository.checkpoint(job)).rejects.toThrow('WRITING_LEASE_LOST');
    expect(h.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false);
  });
  it.each([[4, 'QUEUED'], [7, 'QUEUED'], [8, 'FAILED']] as const)('persists run %s as %s for invalid evidence despite maxAttempts=3', async (count, status) => {
    const h = setup(true, true);
    const currentJob = { ...job, attempt_count: count, config_snapshot: { ...job.config_snapshot, maxAttempts: 3 } };
    await h.repository.fail(currentJob, 'AI_WRITING_EVIDENCE_INVALID', true, 30000);
    expect(h.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE writing_grading_jobs SET status='),
      [job.id, status, 'AI_WRITING_EVIDENCE_INVALID', 30000, null]);
  });
  it.each([true, false])('inherits only compatible checkpoints on manual retry: %s', async compatible => {
    const { input, result } = writingFixture(2);
    const config = new WritingAiConfig(new ConfigService()).snapshot('vi');
    const hash = writingInputHash(input, config);
    const feedback = { stage: 'part_2', rule: 'EVIDENCE_ID_INVALID' };
    const query = jest.fn(async (sql: string, _params?: unknown[]) => {
      if (sql.startsWith('SELECT stage_results')) return compatible ? [{ stage_results: {
        version: 1, inputHash: hash, parts: { 2: result }, final: result,
      }, last_validation_failure: feedback }] : [];
      if (sql.startsWith('UPDATE test_attempts')) return [{ id: 'attempt' }];
      return [];
    });
    const repository = new WritingGradingJobsRepository({} as any);
    await repository.enqueue({ query } as any, { id: 'attempt', component: 'WRITING', status: 'SUBMITTED', assessment_revision: 2 } as any, input, config);
    const lookup = query.mock.calls.find(([sql]) => sql.startsWith('SELECT stage_results'))!;
    expect(lookup[0]).toContain("status='FAILED' AND input_hash=$3");
    expect(lookup[1]).toEqual(['attempt', 2, hash]);
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO writing_grading_jobs'))![1] as any[];
    const inherited = JSON.parse(insert[4]);
    expect(inherited.parts).toEqual(compatible ? { 2: result } : undefined);
    expect(inherited.final).toBeUndefined();
    expect(insert[5]).toBe(compatible ? JSON.stringify(feedback) : null);
  });
});
