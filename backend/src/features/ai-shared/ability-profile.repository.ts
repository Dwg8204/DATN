import { EntityManager } from "typeorm";
import { AbilityAttempt, buildAbilityProfile } from "./ability-profile";
/** Bounded historical evidence, independent of any learning goal. */
export async function readAbilityProfile(
  manager: EntityManager,
  userId: string,
  asOf: Date,
) {
  const fields =
    "id,component,purpose,scope,part_number,status,submitted_at,score,max_score,estimated_cefr,result";
  const rows = await manager.query<AbilityAttempt[]>(
    `WITH eligible AS (
 SELECT ${fields} FROM test_attempts WHERE student_id=$1 AND status='SUBMITTED' AND submitted_at<=$2 AND result->>'method' IN ('OBJECTIVE','AI')),
 full_ranked AS (SELECT *,row_number() OVER(PARTITION BY component ORDER BY submitted_at DESC,id ASC) rn FROM eligible
 WHERE scope='FULL_SKILL' AND (estimated_cefr IN ('A1','A2','B1','B2','C','C1','C2') OR (component='READING' AND result->>'method'='OBJECTIVE' AND score IS NOT NULL AND max_score>0 AND score BETWEEN 0 AND max_score AND (SELECT count(DISTINCT (p->>'partNumber')::int) FROM jsonb_array_elements(COALESCE(result->'parts','[]'::jsonb)) p WHERE (p->>'partNumber')::int BETWEEN 1 AND 4 AND (p->>'maxScore')::numeric>0)=4))),
 recent AS (SELECT ${fields} FROM eligible WHERE submitted_at >= $2::timestamptz - interval '60 days' AND ((score IS NOT NULL AND max_score>0) OR result->>'method'='AI') ORDER BY submitted_at DESC,id ASC LIMIT 20)
 SELECT ${fields} FROM full_ranked WHERE rn<=3 UNION SELECT ${fields} FROM recent`,
    [userId, asOf],
  );
  return buildAbilityProfile(rows, asOf);
}
