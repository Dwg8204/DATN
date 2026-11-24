import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from '../../../common/cache/redis-cache.service';
import { StudentDashboardService } from './student-dashboard.service';
import { StudentDashboardQueryDto } from '../dto/student-dashboard-query.dto';
import { TestAttemptsRepository } from '../repositories/test-attempts.repository';
import { AuthUser } from '../../auth/types/auth-user.type';

function fixture() {
  const storage = new Map<string, string>();
  const cache = new RedisCacheService(new ConfigService());
  const client = {
    status: 'ready', get: jest.fn(async (key: string) => storage.get(key) ?? null),
    set: jest.fn(async (key: string, value: string) => { storage.set(key, value); }), del: jest.fn(),
  };
  (cache as any).client = client;
  const manager = { query: jest.fn(async () => []) };
  const repository = {
    dashboardCacheState: jest.fn(async (_id: string) => ({ timezone: 'Asia/Ho_Chi_Minh', revision: 'r1' })),
    dataSource: { manager }, dashboardAttempts: jest.fn(async (_id: string) => []),
  };
  const service = new StudentDashboardService(repository as unknown as TestAttemptsRepository, cache);
  return { service, repository, client, manager };
}
const actor = (id: string) => ({ id } as AuthUser);

describe('student dashboard Redis cache', () => {
  it('avoids the two expensive queries on a cache hit and uses TTL 45', async () => {
    const { service, repository, manager, client } = fixture();
    const query = new StudentDashboardQueryDto();
    const first = await service.get(actor('a'), query);
    expect(await service.get(actor('a'), query)).toEqual(first);
    expect(repository.dashboardCacheState).toHaveBeenCalledTimes(2);
    expect(repository.dashboardAttempts).toHaveBeenCalledTimes(1);
    expect(manager.query).toHaveBeenCalledTimes(1);
    expect(client.set).toHaveBeenCalledWith(expect.stringContaining('student-dashboard:v1'), expect.any(String), 'EX', 45);
  });

  it('separates accounts and all supported filters', async () => {
    const { service, repository } = fixture();
    const query = new StudentDashboardQueryDto();
    await service.get(actor('a'), query);
    await service.get(actor('b'), query);
    await service.get(actor('a'), { ...query, skill: 'writing' });
    await service.get(actor('a'), { ...query, part: 'part1' });
    await service.get(actor('a'), { ...query, range: '7' });
    expect(repository.dashboardAttempts.mock.calls.map(([id]) => id)).toEqual(['a','b','a','a','a']);
  });

  it('refreshes immediately when grading/submission revision or timezone changes', async () => {
    const { service, repository } = fixture();
    const query = new StudentDashboardQueryDto();
    await service.get(actor('a'), query);
    repository.dashboardCacheState.mockResolvedValue({ timezone: 'Asia/Ho_Chi_Minh', revision: 'graded-r2' });
    await service.get(actor('a'), query);
    repository.dashboardCacheState.mockResolvedValue({ timezone: 'UTC', revision: 'graded-r2' });
    await service.get(actor('a'), query);
    expect(repository.dashboardAttempts).toHaveBeenCalledTimes(3);
  });

  it('falls back when Redis is disconnected and propagates database failures', async () => {
    const { service, repository, client } = fixture();
    client.status = 'end';
    await service.get(actor('a'), new StudentDashboardQueryDto());
    expect(repository.dashboardAttempts).toHaveBeenCalledTimes(1);
    repository.dashboardCacheState.mockRejectedValue(new Error('database unavailable'));
    await expect(service.get(actor('a'), new StudentDashboardQueryDto())).rejects.toThrow('database unavailable');
  });
});
