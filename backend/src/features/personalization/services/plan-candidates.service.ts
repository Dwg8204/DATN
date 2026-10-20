import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SkillComponent } from '../../test-attempts/types/attempt.type';
import { PlanCandidate } from '../policies/rule-plan';
import { SNAPSHOT_SKILLS } from '../policies/learner-snapshot';
import { SnapshotService } from './snapshot.service';

type Snapshot = Awaited<ReturnType<SnapshotService['build']>>;
@Injectable()
export class PlanCandidatesService {
  async build(
    manager: EntityManager,
    userId: string,
    snapshot: Snapshot,
  ): Promise<PlanCandidate[]> {
    const tests = await manager.query<
      Array<{
        id: string;
        component: SkillComponent;
        part_number: number | null;
        purpose: string;
        title: string;
        used: boolean;
      }>
    >(
      `WITH candidates AS (
      SELECT t.id,t.component,t.part_number,t.purpose,t.title,
        EXISTS(SELECT 1 FROM test_attempts a JOIN test_snapshots s ON s.id=a.snapshot_id WHERE a.student_id=$1 AND a.status='SUBMITTED' AND s.test_id=t.id) AS used
      FROM tests t JOIN test_snapshots s ON s.id=t.published_snapshot_id
      WHERE t.status='PUBLISHED' AND t.archived_at IS NULL AND s.schema_version=1
        AND (t.purpose='PRACTICE' OR t.scope='FULL_SKILL')),
      ranked AS (SELECT *,row_number() OVER(PARTITION BY component ORDER BY used,id) rank FROM candidates)
      SELECT * FROM ranked WHERE rank<=5 ORDER BY component,used,id`,
      [userId],
    );
    const weakParts = snapshot.weak.parts
      .slice()
      .sort((a, b) => a.percent - b.percent);
    const order = [
      ...new Set([...weakParts.map((part) => part.skill), ...SNAPSHOT_SKILLS]),
    ];
    tests.sort(
      (a, b) =>
        order.indexOf(a.component) - order.indexOf(b.component) ||
        Number(
          !weakParts.some(
            (p) => p.skill === a.component && p.part === a.part_number,
          ),
        ) -
          Number(
            !weakParts.some(
              (p) => p.skill === b.component && p.part === b.part_number,
            ),
          ) ||
        Number(a.used) - Number(b.used) ||
        a.id.localeCompare(b.id),
    );
    const reviewed = await manager.query<
      Array<{ source_attempt_id: string; question_keys: string[] }>
    >(
      `SELECT i.source_attempt_id,i.question_keys FROM study_plan_items i JOIN study_plans p ON p.id=i.plan_id
      WHERE p.user_id=$1 AND i.activity_type='MISTAKE_REVIEW' AND i.completed_at IS NOT NULL`,
      [userId],
    );
    const seen = new Set(
      reviewed.flatMap((row) =>
        row.question_keys.map((key) => `${row.source_attempt_id}:${key}`),
      ),
    );
    const groups = new Map<
      string,
      { component: SkillComponent; keys: string[] }
    >();
    for (const mistake of snapshot.mistakes.references) {
      if (seen.has(`${mistake.attemptId}:${mistake.questionKey}`)) continue;
      const group = groups.get(mistake.attemptId) ?? {
        component: mistake.component,
        keys: [],
      };
      if (!group.keys.includes(mistake.questionKey) && group.keys.length < 10)
        group.keys.push(mistake.questionKey);
      groups.set(mistake.attemptId, group);
    }
    const candidates: PlanCandidate[] = tests
      .filter(
        (test, index) =>
          tests
            .slice(0, index)
            .filter((previous) => previous.component === test.component)
            .length < 4,
      )
      .map((test) => ({
        candidateId: '',
        activityType: 'TEST',
        testId: test.id,
        component: test.component,
        partNumber: test.part_number ?? undefined,
        purpose: test.purpose,
        title: test.title,
      }));
    for (const targetCount of [10, 20, 30] as const)
      candidates.push({
        candidateId: '',
        activityType: 'VOCAB_REVIEW',
        targetCount,
      });
    for (const [sourceAttemptId, group] of groups)
      if (group.keys.length >= 3 && candidates.length < 30)
        candidates.push({
          candidateId: '',
          activityType: 'MISTAKE_REVIEW',
          sourceAttemptId,
          component: group.component,
          questionKeys: group.keys,
        });
    return candidates.map((candidate, i) => ({
      ...candidate,
      candidateId: `c${i + 1}`,
    }));
  }
}
