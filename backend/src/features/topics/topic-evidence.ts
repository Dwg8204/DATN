import { EntityManager } from "typeorm";
import { TOPIC_COVERAGE_SQL } from "./topics.service";

/** Only current approved labels for the exact assessed question version count. */
export async function readWeakTopics(
  m: EntityManager,
  userId: string,
  from: Date | string,
  until: Date | string,
) {
  return m.query<
    Array<{
      topicId: string;
      code: string;
      name: string;
      component: string;
      opportunities: number;
      errors: number;
      errorRatio: number;
      distinctTests: number;
    }>
  >(
    `
    WITH catalog AS MATERIALIZED (SELECT * FROM topic_question_catalog),
    coverage AS (${TOPIC_COVERAGE_SQL.replaceAll('topic_question_catalog', 'catalog')}), eligible AS (
      SELECT e.*,a.snapshot_id FROM learning_evidence e JOIN test_attempts a ON a.id=e.attempt_id
      JOIN question_topics l ON l.question_id=e.question_id AND l.topic_id=e.topic_id AND l.status='APPROVED'
      JOIN catalog q ON q.id=e.question_id AND q.question_hash=l.question_hash
      JOIN topic_snapshot_questions sq ON sq.snapshot_id=a.snapshot_id AND sq.question_id=q.id AND sq.question_hash=l.question_hash
      WHERE e.user_id=$1 AND a.assessment_revision=e.assessment_revision AND a.status='SUBMITTED'
        AND e.observed_at >= $2 AND e.observed_at <= $3 AND e.evidence_quality='OBJECTIVE'
    ) SELECT p.id "topicId",p.code,p.name,p.component,count(*)::int opportunities,
      sum(e.error_count)::int errors,(sum(e.error_count*e.topic_weight)/sum(e.topic_weight))::float "errorRatio",
      count(DISTINCT s.test_id)::int "distinctTests"
    FROM eligible e JOIN learning_topics p ON p.id=e.topic_id JOIN test_snapshots s ON s.id=e.snapshot_id
    JOIN coverage c ON c.component=p.component AND c.total>0 AND c.approved::numeric/c.total>=0.8
    WHERE p.is_active GROUP BY p.id HAVING count(DISTINCT e.question_id)>=3 AND sum(e.error_count*e.topic_weight)/sum(e.topic_weight)>=0.4
    ORDER BY "errorRatio" DESC,opportunities DESC,p.code LIMIT 10`,
    [userId, from, until],
  );
}

export async function processTopicEvidence(
  m: EntityManager,
  attemptId: string,
) {
  const [a] = await m.query(
    `SELECT a.*,s.test_id FROM test_attempts a JOIN test_snapshots s ON s.id=a.snapshot_id WHERE a.id=$1`,
    [attemptId],
  );
  if (!a) return;
  // Serializes state recomputation for concurrent assessments by the same learner.
  await m.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [a.student_id]);
  await m.query("DELETE FROM learning_evidence WHERE attempt_id=$1", [a.id]);
  const method = a.result?.method;
  if (
    a.status === "SUBMITTED" &&
    ["OBJECTIVE", "AI", "MANUAL"].includes(method)
  ) {
    const labels = await m.query(
      `SELECT l.*,q.question_key FROM topic_snapshot_questions q
      JOIN question_topics l ON l.question_id=q.question_id AND l.question_hash=q.question_hash AND l.status='APPROVED'
      JOIN topic_question_catalog live ON live.id=q.question_id AND live.question_hash=q.question_hash
      JOIN learning_topics p ON p.id=l.topic_id AND p.is_active
      WHERE q.snapshot_id=$1`,
      [a.snapshot_id],
    );
    for (const label of labels) {
      const item = Array.isArray(a.result?.items)
        ? a.result.items.find((i: any) => i?.key === label.question_key)
        : undefined;
      if (
        a.part_number &&
        Number(label.question_key.split(":")[0].slice(1)) !== a.part_number
      )
        continue;
      const objective =
        method === "OBJECTIVE" &&
        item &&
        ["CORRECT", "INCORRECT", "SKIPPED"].includes(item.outcome);
      if (method === "OBJECTIVE" && !objective) continue;
      await m.query(
        `INSERT INTO learning_evidence(user_id,topic_id,attempt_id,assessment_revision,evidence_scope,question_id,part_number,outcome,topic_weight,opportunities_count,error_count,score,max_score,evidence_quality,evidence_refs,observed_at)
        VALUES($1,$2,$3,$4,'QUESTION',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          a.student_id,
          label.topic_id,
          a.id,
          a.assessment_revision,
          label.question_id,
          Number(label.question_key.split(":")[0].slice(1)),
          objective ? item.outcome : "OBSERVED",
          label.weight,
          objective ? 1 : 0,
          objective && item.outcome !== "CORRECT" ? 1 : 0,
          objective ? item.score : null,
          objective ? item.maxScore : null,
          objective ? "OBJECTIVE" : "OBSERVED",
          {
            questionKey: label.question_key,
            questionHash: label.question_hash,
          },
          a.submitted_at,
        ],
      );
    }
  }
  await m.query("DELETE FROM learner_topic_states WHERE user_id=$1", [
    a.student_id,
  ]);
  await m.query(
    `INSERT INTO learner_topic_states(user_id,topic_id,summary,evidence_count,distinct_test_count,last_practiced_at,computed_at,algorithm_version)
    SELECT e.user_id,e.topic_id,jsonb_build_object('opportunities',sum(e.opportunities_count),'errors',sum(e.error_count)),count(*)::int,
      count(DISTINCT s.test_id)::int,max(e.observed_at),now(),'approved-topic-v1'
    FROM learning_evidence e JOIN test_attempts a ON a.id=e.attempt_id AND a.assessment_revision=e.assessment_revision
    JOIN test_snapshots s ON s.id=a.snapshot_id
    JOIN question_topics l ON l.question_id=e.question_id AND l.topic_id=e.topic_id AND l.status='APPROVED'
    JOIN topic_question_catalog q ON q.id=e.question_id AND q.question_hash=l.question_hash
    JOIN topic_snapshot_questions sq ON sq.snapshot_id=a.snapshot_id AND sq.question_id=q.id AND sq.question_hash=l.question_hash
    WHERE e.user_id=$1 GROUP BY e.user_id,e.topic_id`,
    [a.student_id],
  );
}
