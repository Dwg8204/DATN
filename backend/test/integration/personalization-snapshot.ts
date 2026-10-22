import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withPersonalizationDatabase } from './personalization-fixture';
import { LearningGoalsRepository } from '../../src/features/personalization/repositories/learning-goals.repository';
import { GoalsService } from '../../src/features/personalization/services/goals.service';
import { SnapshotService } from '../../src/features/personalization/services/snapshot.service';
import { MistakeSourceService } from '../../src/features/personalization/services/mistake-source.service';
import { AuthUser } from '../../src/features/auth/types/auth-user.type';
import { PlanProgressRepository } from '../../src/features/personalization/repositories/plan-progress.repository';
import { StudyPlansRepository } from '../../src/features/personalization/repositories/study-plans.repository';

withPersonalizationDatabase(async (db, alice, bob) => {
  const repository = new LearningGoalsRepository(db);
  const clock = { now: () => new Date('2026-10-30T05:00:00Z') };
  const goals = new GoalsService(
    db,
    repository,
    clock,
    new PlanProgressRepository(new StudyPlansRepository(db)),
  );
  const service = new SnapshotService(
    db,
    goals,
    repository,
    { recent: async () => [] } as unknown as MistakeSourceService,
    clock,
  );
  const goal = await repository.create(alice, {
    targetCefr: 'B2',
    targetTests: 500,
    durationDays: 30,
    startDate: '2026-10-01',
    timezone: 'Asia/Bangkok',
  });
  const testId = randomUUID(),
    snapshotId = randomUUID();
  await db.query(
    "INSERT INTO tests(id,created_by,title,component,purpose,scope) VALUES($1,$2,'Snapshot fixture','READING','EXAM','FULL_SKILL')",
    [testId, alice],
  );
  await db.query(
    "INSERT INTO test_snapshots(id,test_id,version,schema_version,snapshot,content_hash) VALUES($1,$2,1,1,'{}',$3)",
    [snapshotId, testId, 'a'.repeat(64)],
  );
  const result = {
    method: 'OBJECTIVE',
    parts: [1, 2, 3, 4].map((partNumber) => ({
      partNumber,
      score: 7,
      maxScore: 10,
    })),
  };
  await db.query(
    `INSERT INTO test_attempts(student_id,snapshot_id,component,scope,status,purpose,started_at,submitted_at,score,max_score,result)
    SELECT $1,$2,'READING','FULL_SKILL','SUBMITTED','EXAM','2026-10-20T04:00Z','2026-10-20T05:00Z',28,40,$3 FROM generate_series(1,205)`,
    [alice, snapshotId, result],
  );
  await db.query(
    `INSERT INTO test_attempts(student_id,snapshot_id,component,scope,status,purpose,started_at,submitted_at,score,max_score,result)
    VALUES($1,$2,'READING','FULL_SKILL','SUBMITTED','EXAM','2026-10-02T04:00Z','2026-10-02T05:00Z',28,40,$3)`,
    [alice, snapshotId, result],
  );
  const actor = { id: alice, role: 'STUDENT' } as AuthUser;
  const weekly = await service.build(actor, goal, {
    kind: 'WEEKLY',
    from: '2026-10-01',
    to: '2026-10-07',
  });
  assert.equal(weekly.goal?.completed, 206);
  assert.equal(weekly.statistics.attemptsConsidered, 1);
  assert.equal(weekly.cumulative.statistics.attemptsConsidered, 200);
  assert.equal(weekly.band.overallEstimate, null, 'one skill is not an overall band');
  assert.equal(weekly.band.bySkill.find(s=>s.skill==='READING')?.band,'B2');
  assert.equal(weekly.band.bySkill.find(s=>s.skill==='READING')?.sampleSize,3);
  const comment = await service.build(actor, null, { kind: 'COMMENT' });
  assert.equal(comment.statistics.attemptsConsidered, 20);
  const other = await service.build({ ...actor, id: bob }, null, {
    kind: 'COMMENT',
  });
  assert.equal(other.cumulative.completed, 0);
  await assert.rejects(
    () => service.build({ ...actor, id: bob }, goal, { kind: 'FINAL' }),
    /owner mismatch/,
  );
  console.log(
    'PASS GĐ3: exact progress beyond 200 attempts, independent historical period query, bounded cumulative/comment scores, Reading estimate and ownership.',
  );
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
