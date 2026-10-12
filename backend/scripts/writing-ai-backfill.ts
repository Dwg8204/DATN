import 'reflect-metadata';
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import database from '../src/database/data-source';
import { WritingAiConfig } from '../src/features/writing-assessment/writing-ai-config.service';
import { WritingGradingJobsRepository } from '../src/features/writing-assessment/repositories/writing-grading-jobs.repository';
import { WritingInputBuilder } from '../src/features/writing-assessment/services/writing-input-builder.service';
import { WritingAssessmentCoordinator } from '../src/features/writing-assessment/services/writing-assessment-coordinator.service';
import { LockedAttemptRow } from '../src/features/test-attempts/types/attempt.type';

async function main() {
  const id = process.argv[process.argv.indexOf('--attempt-id') + 1];
  if (!process.argv.includes('--attempt-id') || !/^[0-9a-f-]{36}$/i.test(id ?? ''))
    throw new Error('Specify one valid --attempt-id.');
  const config = new WritingAiConfig(new ConfigService(process.env));
  if (!config.enabled) throw new Error('Enable Writing AI before enqueueing an old attempt.');
  await database.initialize();
  try {
    const coordinator = new WritingAssessmentCoordinator(
      config,
      new WritingGradingJobsRepository(database),
      new WritingInputBuilder(),
    );
    await database.transaction(async (manager) => {
      const [attempt] = await manager.query<LockedAttemptRow[]>(
        `SELECT * FROM test_attempts a WHERE id=$1 AND component='WRITING'
        AND status='SUBMITTED' AND result->>'method' IN ('PENDING_AI','UNASSESSED')
        AND NOT EXISTS(SELECT 1 FROM writing_grading_jobs j WHERE j.attempt_id=a.id) FOR UPDATE`,
        [id],
      );
      if (!attempt) throw new Error('Attempt is not eligible or already has a job.');
      if (!process.argv.includes('--apply')) {
        console.log(
          JSON.stringify({
            eligible: true,
            scope: attempt.scope,
            partNumber: attempt.part_number,
            applied: false,
          }),
        );
        return;
      }
      await manager.query(
        `UPDATE test_attempts SET result=jsonb_set(result,'{method}','"PENDING_AI"'),score=NULL,max_score=NULL WHERE id=$1 AND component='WRITING'`,
        [id],
      );
      const updated = await coordinator.enqueue(manager, attempt);
      console.log(
        JSON.stringify({
          applied: true,
          gradingStatus: updated.grading_status,
          revision: updated.assessment_revision,
        }),
      );
    });
  } finally {
    await database.destroy();
  }
}
main().catch(() => {
  console.error('Writing backfill failed. Check the attempt id, migration and Writing configuration.');
  process.exitCode = 1;
});
