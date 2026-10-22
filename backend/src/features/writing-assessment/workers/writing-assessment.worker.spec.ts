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
import { evidenceFixture } from '../testing/writing-evidence.fixture';
import { writingEvidenceCatalog } from '../services/writing-evidence-ids';

describe('Writing worker validates before persistence', () => {
  it('allows invalid output through run seven, stops at eight, and only persists valid feedback', async () => {
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
      checkpoint: jest.fn(async () => undefined),
    };
    const bad = structuredClone(fixture.result);
    bad.summary.overallComment = ' ';
    const provider = { generateStructured: jest.fn().mockResolvedValue(evidenceFixture(bad, writingEvidenceCatalog(fixture.input))) };
    const worker = new WritingAssessmentWorker(
      config,
      store as unknown as WritingGradingJobsRepository,
      new WritingInputBuilder(),
      new WritingAssessmentService(provider, new WritingAssessmentValidator()),
    );
    await worker.runOnce();
    expect(store.finish).not.toHaveBeenCalled();
    expect(store.fail).toHaveBeenLastCalledWith(job, 'AI_INVALID_RESPONSE', true, expect.any(Number), expect.objectContaining({ stage: 'part_2' }));
    job.attempt_count = 7;
    await worker.runOnce();
    expect(store.fail).toHaveBeenLastCalledWith(job, 'AI_INVALID_RESPONSE', true, expect.any(Number), expect.objectContaining({ stage: 'part_2' }));
    job.attempt_count = 8;
    await worker.runOnce();
    expect(store.fail).toHaveBeenLastCalledWith(job, 'AI_INVALID_RESPONSE', false, expect.any(Number), expect.objectContaining({ stage: 'part_2' }));
    provider.generateStructured.mockResolvedValue(evidenceFixture(fixture.result, writingEvidenceCatalog(fixture.input)));
    await worker.runOnce();
    expect(store.finish).toHaveBeenCalledTimes(1);
  });
});
