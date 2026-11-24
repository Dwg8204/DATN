import { Injectable, Optional } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { SkillComponent } from "../../test-attempts/types/attempt.type";
import { PlanCandidate } from "../policies/rule-plan";
import { SNAPSHOT_SKILLS } from "../policies/learner-snapshot";
import { SnapshotService } from "./snapshot.service";

import {
  REGULAR_TEST_SQL,
  PLACEMENT_REQUIRED,
  placementTests,
} from "../../ai-shared/placement";
export { REGULAR_TEST_SQL } from "../../ai-shared/placement";
import { RetrievalCandidatesService } from "./retrieval-candidates.service";
import { rankTestCandidates } from "../policies/rank-test-candidates";
type Snapshot = Awaited<ReturnType<SnapshotService["build"]>>;
@Injectable()
export class PlanCandidatesService {
  constructor(
    @Optional() private readonly retrieval?: RetrievalCandidatesService,
  ) {}
  async build(
    manager: EntityManager,
    userId: string,
    snapshot: Snapshot,
    weekIndex = 1,
  ): Promise<PlanCandidate[]> {
    const rag = this.retrieval?.enabled ?? false;
    const matches = rag
      ? await this.retrieval!.rankTests(manager, userId, snapshot)
      : new Map();
    let tests = await manager.query<
      Array<{
        id: string;
        component: SkillComponent;
        part_number: number | null;
        purpose: string;
        title: string;
        used: boolean;
        random_seed: string;
      }>
    >(
      `WITH candidates AS (
      SELECT t.id,t.component,t.part_number,t.purpose,t.title,
        COALESCE((SELECT m.tier FROM jsonb_to_recordset($4::jsonb) m(id uuid,tier integer) WHERE m.id=t.id),
          CASE WHEN EXISTS(SELECT 1 FROM jsonb_to_recordset($2::jsonb) w(skill text,part integer) WHERE w.skill=t.component::text AND w.part=t.part_number) THEN 3 ELSE 4 END) tier,
        COALESCE((SELECT m.count FROM jsonb_to_recordset($4::jsonb) m(id uuid,count integer) WHERE m.id=t.id),0) match_count,
        COALESCE((SELECT m.score FROM jsonb_to_recordset($4::jsonb) m(id uuid,score double precision) WHERE m.id=t.id),0) match_score,
        EXISTS(SELECT 1 FROM jsonb_to_recordset($2::jsonb) AS w(skill text,part integer) WHERE w.skill=t.component::text AND w.part=t.part_number) is_weak,
        md5($1::text || ':' || $3::text || ':' || t.id::text) random_seed,
        EXISTS(SELECT 1 FROM test_attempts a JOIN test_snapshots s ON s.id=a.snapshot_id WHERE a.student_id=$1::uuid AND a.status='SUBMITTED' AND s.test_id=t.id) AS used
      FROM tests t JOIN test_snapshots s ON s.id=t.published_snapshot_id
      WHERE t.status='PUBLISHED' AND t.archived_at IS NULL AND s.schema_version=1
        AND (t.purpose='PRACTICE' OR t.scope='FULL_SKILL') AND ${REGULAR_TEST_SQL}),
      ranked AS (SELECT *,row_number() OVER(PARTITION BY component ORDER BY tier,match_count DESC,match_score DESC,used,random_seed,id) rank FROM candidates)
      SELECT * FROM ranked WHERE rank<=21 ORDER BY component,tier,match_count DESC,match_score DESC,used,random_seed,id`,
      [
        userId,
        JSON.stringify(
          snapshot.weak.parts.map(({ skill, part }) => ({ skill, part })),
        ),
        weekIndex,
        JSON.stringify(
          [...matches].map(([id, r]) => ({
            id,
            tier: r.tier,
            count: r.matchCount,
            score: r.score,
          })),
        ),
      ],
    );
    const weakParts = snapshot.weak.parts
      .slice()
      .sort((a, b) => a.percent - b.percent);
    const order = [
      ...new Set([...weakParts.map((part) => part.skill), ...SNAPSHOT_SKILLS]),
    ];
    tests = rankTestCandidates(tests, order, weakParts, matches);
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
    const candidates: PlanCandidate[] = tests.map((test) => ({
      candidateId: "",
      activityType: "TEST",
      testId: test.id,
      component: test.component,
      partNumber: test.part_number ?? undefined,
      purpose: test.purpose,
      title: test.title,
      ...(rag
        ? {
            tier:
              matches.get(test.id)?.tier ??
              (["WRITING", "SPEAKING"].includes(test.component) ||
              weakParts.some(
                (p) =>
                  p.skill === test.component && p.part === test.part_number,
              )
                ? 3
                : 4),
            matchCount: matches.get(test.id)?.matchCount ?? 0,
            retrieval: matches.get(test.id) ?? {
              tier:
                ["WRITING", "SPEAKING"].includes(test.component) ||
                weakParts.some(
                  (p) =>
                    p.skill === test.component && p.part === test.part_number,
                )
                  ? 3
                  : 4,
              matchCount: 0,
              matchedTopics: [],
            },
          }
        : {}),
    }));
    for (const targetCount of [10, 20] as const)
      if (snapshot.vocab.activeCount >= targetCount)
        candidates.push({
          candidateId: "",
          activityType: "VOCAB_REVIEW",
          targetCount,
        });
    if (snapshot.weak.topics.length) {
      const topicTests = await manager.query(
        rag
          ? `WITH counts AS (
        SELECT l.topic_id,t.id,t.title,t.component,t.part_number,t.purpose,COUNT(DISTINCT q.id) topic_count,
          EXISTS(SELECT 1 FROM test_attempts a JOIN test_snapshots s ON s.id=a.snapshot_id WHERE a.student_id=$2 AND a.status='SUBMITTED' AND s.test_id=t.id) used
        FROM tests t JOIN topic_question_catalog q ON q.test_id=t.id
        JOIN question_topics l ON l.question_id=q.id AND l.status='APPROVED' AND l.question_hash=q.question_hash
        JOIN topic_snapshot_questions sq ON sq.snapshot_id=t.published_snapshot_id AND sq.question_id=q.id AND sq.question_hash=q.question_hash
        JOIN learning_topics p ON p.id=l.topic_id AND p.is_active
        WHERE l.topic_id=ANY($1::uuid[]) AND t.status='PUBLISHED' AND t.archived_at IS NULL
          AND (t.purpose='PRACTICE' OR t.scope='FULL_SKILL') AND ${REGULAR_TEST_SQL}
        GROUP BY l.topic_id,t.id)
        SELECT DISTINCT ON(topic_id) * FROM counts ORDER BY topic_id,used,topic_count DESC,id`
          : `SELECT DISTINCT ON (l.topic_id) l.topic_id,t.id,t.title,t.component,t.part_number,t.purpose
        FROM tests t JOIN topic_question_catalog q ON q.test_id=t.id
        JOIN question_topics l ON l.question_id=q.id AND l.status='APPROVED' AND l.question_hash=q.question_hash
        JOIN topic_snapshot_questions sq ON sq.snapshot_id=t.published_snapshot_id AND sq.question_id=q.id AND sq.question_hash=q.question_hash
        JOIN learning_topics p ON p.id=l.topic_id AND p.is_active
        WHERE l.topic_id=ANY($1::uuid[]) AND t.status='PUBLISHED' AND t.archived_at IS NULL
          AND (t.purpose='PRACTICE' OR t.scope='FULL_SKILL') AND ${REGULAR_TEST_SQL} ORDER BY l.topic_id,t.id`,
        rag
          ? [snapshot.weak.topics.map((w) => w.topicId), userId]
          : [snapshot.weak.topics.map((w) => w.topicId)],
      );
      for (const weak of snapshot.weak.topics) {
        const test = topicTests.find(
          (t: { topic_id: string }) => t.topic_id === weak.topicId,
        );
        if (test)
          candidates.push({
            candidateId: "",
            activityType: "TOPIC_REVIEW",
            topicId: weak.topicId,
            topicName: weak.name,
            ...(rag
              ? {
                  tier: 2,
                  matchCount: 0,
                  retrieval: {
                    tier: 2 as const,
                    matchCount: 0,
                    matchedTopics: [weak.name],
                  },
                }
              : {}),
            testId: test.id,
            title: test.title,
            component: test.component,
            partNumber: test.part_number ?? undefined,
            purpose: test.purpose,
          });
      }
    }
    let mistakeCount = 0;
    for (const [sourceAttemptId, group] of groups)
      if (group.keys.length >= 3 && mistakeCount++ < 7)
        candidates.push({
          candidateId: "",
          activityType: "MISTAKE_REVIEW",
          sourceAttemptId,
          component: group.component,
          questionKeys: group.keys,
        });
    if (weekIndex === 1) {
      const available = await placementTests(manager);
      const missing = PLACEMENT_REQUIRED.filter(
        (skill) =>
          !snapshot.band.bySkill.some(
            (s) => s.skill === skill && (s.assessmentComplete ?? !!s.band),
          ),
      );
      candidates.unshift(
        ...missing.flatMap((skill) => {
          const t = available.find((t) => t.skill === skill);
          return t
            ? [
                {
                  candidateId: "",
                  activityType: "TEST" as const,
                  testId: t.testId,
                  component: t.skill,
                  purpose: "PLACEMENT",
                  title: t.title,
                },
              ]
            : [];
        }),
      );
    }
    return candidates.map((candidate, i) => ({
      ...candidate,
      candidateId: `c${i + 1}`,
    }));
  }
}
