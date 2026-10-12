import { ConfigService } from '@nestjs/config';
import { WritingAiConfig } from '../writing-ai-config.service';
import { WritingAssessmentWorker } from './writing-assessment.worker';
import {
  WritingGradingJobsRepository,
  WritingJob,
  writingInputHash,
} from '../repositories/writing-grading-jobs.repository';
import { WritingInputBuilder } from '../services/writing-input-builder.service';
import { WritingAssessmentService } from '../services/writing-assessment.service';
import { WritingAssessmentValidator } from '../services/writing-assessment-validator.service';
import { writingFixture } from '../testing/writing.fixture';

describe('Writing worker validates before persistence', () => {
  it('retries empty AI feedback once, never completes it, and then saves valid feedback', async () => {
    const fixture = writingFixture(2);
    const config = new WritingAiConfig(new ConfigService());
    const snapshot = config.snapshot('vi');
    const job: WritingJob = {
      id: 'job',
      attempt_id: 'attempt',
      assessment_revision: 2,
      input_hash: writingInputHash(fixture.input, snapshot),
      config_snapshot: snapshot,
      attempt_count: 1,
      lease_token: 'lease',
      error_code: null,
    };
    const store = {
      claim: jest.fn(async () => job),
      context: jest.fn(async () => ({
        snapshot: fixture.snapshot,
        answers: fixture.answers,
        scope: 'PART',
        result: { method: 'PENDING_AI', parts: [], items: [] },
      })),
      fail: jest.fn(async () => undefined),
      finish: jest.fn(async () => undefined),
    };
    const bad = structuredClone(fixture.result);
    bad.summary.overallComment = ' ';
    const provider = { generateStructured: jest.fn().mockResolvedValue(bad) };
    const worker = new WritingAssessmentWorker(
      config,
      store as unknown as WritingGradingJobsRepository,
      new WritingInputBuilder(),
      new WritingAssessmentService(provider, new WritingAssessmentValidator()),
    );
    await worker.runOnce();
    expect(store.finish).not.toHaveBeenCalled();
    expect(store.fail).toHaveBeenLastCalledWith(job, 'AI_INVALID_RESPONSE', true, expect.any(Number));
    job.attempt_count = 2;
    await worker.runOnce();
    expect(store.fail).toHaveBeenLastCalledWith(job, 'AI_INVALID_RESPONSE', false, expect.any(Number));
    provider.generateStructured.mockResolvedValue(fixture.result);
    await worker.runOnce();
    expect(store.finish).toHaveBeenCalledTimes(1);
  });
});
