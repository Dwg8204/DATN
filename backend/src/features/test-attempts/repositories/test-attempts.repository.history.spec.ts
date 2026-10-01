import { DataSource } from 'typeorm';
import { TestAttemptsRepository } from './test-attempts.repository';

describe('attempt history separation', () => {
  const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: '0' }]);
  const repository = new TestAttemptsRepository({ query } as unknown as DataSource);

  beforeEach(() => {
    query.mockReset().mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: '0' }]);
  });

  it('only lists full exam attempts in Mock tests', async () => {
    await repository.history('student-id', undefined, 1, 10, undefined, undefined, 'desc', 'EXAM');
    expect(query.mock.calls[0][0]).toContain("a.purpose=$2 AND a.scope='FULL_SKILL'");
    expect(query.mock.calls[0][1][1]).toBe('EXAM');
  });

  it('allows both part and full attempts in Practice history', async () => {
    await repository.history('student-id', undefined, 1, 10, undefined, undefined, 'desc', 'PRACTICE');
    expect(query.mock.calls[0][0]).not.toContain("a.scope='FULL_SKILL'");
    expect(query.mock.calls[0][1][1]).toBe('PRACTICE');
  });
});
