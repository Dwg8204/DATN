import { DataSource } from 'typeorm';
import { GoalsService } from './goals.service';
import { PersonalizationProgressService } from './personalization-progress.service';

describe('post-commit personalization recovery', () => {
  it('does not propagate a secondary database failure to a submitted activity', async () => {
    const db = {
      transaction: jest
        .fn()
        .mockRejectedValue(new Error('database unavailable')),
    };
    const progress = new PersonalizationProgressService(
      db as unknown as DataSource,
      {} as GoalsService,
      { now: () => new Date() },
    );
    await expect(progress.afterLearning('learner')).resolves.toBeUndefined();
  });
});
