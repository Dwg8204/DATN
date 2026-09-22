import { AdminDashboardRepository } from '../repositories/admin-dashboard.repository';
import { AdminDashboardService } from './admin-dashboard.service';

describe('AdminDashboardService', () => {
  it('reuses a fresh result for identical period requests', async () => {
    const repository = {
      totals: jest.fn().mockResolvedValue({
        active_current: '2', active_previous: '0', users_current: '1', users_previous: '1',
      }),
      activeLearnerTrend: jest.fn().mockResolvedValue([]),
      newUserTrend: jest.fn().mockResolvedValue([]),
      testsCreated: jest.fn().mockResolvedValue([]),
      testActivity: jest.fn().mockResolvedValue([]),
    } as unknown as AdminDashboardRepository;
    const service = new AdminDashboardService(repository);

    const first = await service.get('week');
    const second = await service.get('week');

    expect(first).toBe(second);
    expect(repository.totals).toHaveBeenCalledTimes(1);
    expect(first.metrics.activeLearners.changeLabel).toBe('New');
  });
});
