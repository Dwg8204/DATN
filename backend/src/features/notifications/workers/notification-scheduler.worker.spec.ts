import { Logger } from '@nestjs/common';
import { NotificationsService } from '../services/notifications.service';
import { NotificationSchedulerWorker } from './notification-scheduler.worker';

describe('NotificationSchedulerWorker', () => {
  const originalEnabled = process.env.NOTIFICATION_SCHEDULER_ENABLED;
  const processBatch = jest.fn();
  let worker: NotificationSchedulerWorker;

  beforeEach(() => {
    jest.useFakeTimers();
    delete process.env.NOTIFICATION_SCHEDULER_ENABLED;
    processBatch.mockReset().mockResolvedValue(0);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    worker = new NotificationSchedulerWorker({ processDueScheduledBatch: processBatch } as unknown as NotificationsService);
  });

  afterEach(async () => {
    await worker.onModuleDestroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
    if (originalEnabled === undefined) delete process.env.NOTIFICATION_SCHEDULER_ENABLED;
    else process.env.NOTIFICATION_SCHEDULER_ENABLED = originalEnabled;
  });

  it('processes schedules at startup and every five seconds without a browser', async () => {
    worker.onModuleInit();
    await jest.advanceTimersByTimeAsync(0);
    expect(processBatch).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(5_000);
    expect(processBatch).toHaveBeenCalledTimes(2);
    await worker.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(10_000);
    expect(processBatch).toHaveBeenCalledTimes(2);
  });

  it('does not overlap a slow scheduled batch', async () => {
    let finish!: (value: number) => void;
    processBatch.mockImplementationOnce(() => new Promise<number>(resolve => { finish = resolve; }));
    worker.onModuleInit();
    await jest.advanceTimersByTimeAsync(15_000);
    expect(processBatch).toHaveBeenCalledTimes(1);
    finish(0);
    await jest.advanceTimersByTimeAsync(5_000);
    expect(processBatch).toHaveBeenCalledTimes(2);
  });

  it('continues polling after a failed batch', async () => {
    processBatch.mockRejectedValueOnce(new Error('Synthetic database failure'));
    worker.onModuleInit();
    await jest.advanceTimersByTimeAsync(5_000);
    expect(processBatch).toHaveBeenCalledTimes(2);
  });

  it('supports explicitly disabling the worker', async () => {
    process.env.NOTIFICATION_SCHEDULER_ENABLED = 'false';
    worker.onModuleInit();
    await jest.advanceTimersByTimeAsync(10_000);
    expect(processBatch).not.toHaveBeenCalled();
  });
});
