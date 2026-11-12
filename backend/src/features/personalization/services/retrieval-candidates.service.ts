import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EntityManager } from "typeorm";
import { QuestionSearchService } from "../../retrieval/question-search.service";
import { EMBEDDING_MODEL } from "../../retrieval/embedding.service";
import { QUESTION_TEXT_VERSION } from "../../retrieval/question-text";
import { PlanRetrieval } from "../types/personalization.type";
import { SnapshotService } from "./snapshot.service";

type Snapshot = Awaited<ReturnType<SnapshotService["build"]>>;
export const objectiveSkills = ["GRAMMAR_VOCAB", "READING", "LISTENING"];
const bounded = (value: unknown, fallback: number, max: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
};

@Injectable()
export class RetrievalCandidatesService {
  constructor(
    private readonly config: ConfigService,
    private readonly questions: QuestionSearchService,
  ) {}
  get enabled() {
    return (
      String(this.config.get("PERSONALIZATION_RAG_ENABLED", false)) === "true"
    );
  }

  async rankTests(
    manager: EntityManager,
    userId: string,
    snapshot: Snapshot,
  ): Promise<Map<string, PlanRetrieval>> {
    const ranked = new Map<string, PlanRetrieval>();
    if (!this.enabled) return ranked;
    const refs = snapshot.mistakes.references
      .filter((r) => objectiveSkills.includes(r.component))
      .slice(0, 30);
    if (!refs.length) return ranked;
    // The hash must match the learner's immutable snapshot AND the stored vector.
    // A question edited since that attempt is skipped instead of querying with its new meaning.
    const sources = await manager.query(
      `SELECT DISTINCT sq.question_id,e.test_id,e.component,e.embedding::text AS vector,
        r."attemptId",r."questionKey"
      FROM jsonb_to_recordset($2::jsonb) r("attemptId" uuid,"questionKey" text,component text)
      JOIN test_attempts a ON a.id=r."attemptId" AND a.student_id=$1 AND a.status='SUBMITTED' AND a.result->>'method'='OBJECTIVE'
      JOIN topic_snapshot_questions sq ON sq.snapshot_id=a.snapshot_id AND sq.question_key=r."questionKey"
      JOIN question_embeddings e ON e.question_id=sq.question_id AND e.question_hash=sq.question_hash
        AND e.component::text=r.component AND e.embedding_model=$3 AND e.embedding_version=$4
      ORDER BY sq.question_id,r."attemptId",r."questionKey"`,
      [userId, JSON.stringify(refs), EMBEDDING_MODEL, QUESTION_TEXT_VERSION],
    );
    const groups = new Map<
      string,
      {
        component: string;
        sources: Map<string, number>;
        ids: Set<string>;
        keys: Set<string>;
      }
    >();
    const unique = new Set<string>();
    for (const source of sources) {
      // Repeated attempts at one source question must not inflate matchCount.
      if (unique.has(source.question_id)) continue;
      unique.add(source.question_id);
      const rawThreshold = Number(
        this.config.get("RAG_QUESTION_MIN_SIMILARITY", 0.75),
      );
      const matches = await this.questions.similar(
        [JSON.parse(source.vector)],
        {
          component: source.component,
          excludeTestIds: [source.test_id],
          regularOnly: true,
          perSource: bounded(
            this.config.get("RAG_SIMILAR_PER_MISTAKE"),
            10,
            50,
          ),
          minSimilarity:
            Number.isFinite(rawThreshold) &&
            rawThreshold >= 0 &&
            rawThreshold <= 1
              ? rawThreshold
              : 0.75,
        },
        manager,
      );
      for (const hit of matches) {
        const group = groups.get(hit.test_id) ?? {
          component: source.component,
          sources: new Map(),
          ids: new Set(),
          keys: new Set(),
        };
        // One best similarity per distinct mistake prevents large tests inflating the score.
        group.sources.set(
          source.question_id,
          Math.max(
            group.sources.get(source.question_id) ?? 0,
            Number(hit.similarity),
          ),
        );
        group.ids.add(String(hit.questionId));
        group.keys.add(`${source.attemptId}:${source.questionKey}`);
        groups.set(hit.test_id, group);
      }
    }
    const min = bounded(this.config.get("RAG_MIN_MATCHES_PER_TEST"), 2, 30);
    for (const [id, group] of groups) {
      if (group.sources.size < min) continue;
      const ids = [...group.ids].sort();
      const topics = await manager.query(
        `SELECT DISTINCT p.name FROM question_topics l
        JOIN learning_topics p ON p.id=l.topic_id AND p.is_active
        JOIN question_embeddings e ON e.question_id=l.question_id AND e.question_hash=l.question_hash
        WHERE l.question_id=ANY($1::uuid[]) AND l.status='APPROVED' ORDER BY p.name LIMIT 5`,
        [ids],
      );
      ranked.set(id, {
        tier: 1,
        matchCount: group.sources.size,
        score: [...group.sources.values()].reduce((a, b) => a + b, 0),
        matchedQuestionIds: ids.slice(0, 5),
        sourceMistakeKeys: [...group.keys].sort().slice(0, 5),
        matchedTopics: topics.map((t: { name: string }) => t.name),
      });
    }
    for (const component of new Set(refs.map((r) => r.component))) {
      if (
        [...groups].some(
          ([id, g]) => g.component === component && ranked.has(id),
        )
      )
        continue;
      await manager.query(
        `INSERT INTO retrieval_gaps(user_id,feature,component,tier) VALUES($1,'PLAN',$2,3)`,
        [userId, component],
      );
    }
    return ranked;
  }
}
