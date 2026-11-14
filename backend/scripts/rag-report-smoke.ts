import { AiRequestRecorder } from '../src/features/ai-shared/ai-request-recorder.service';
import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { withPersonalizationDatabase } from "../test/integration/personalization-fixture";
import { createGeminiServices } from "../src/features/ai-shared/create-gemini-services";
import { PersonalizationAiService } from "../src/features/personalization/services/personalization-ai.service";
import { buildLearnerSnapshot } from "../src/features/personalization/policies/learner-snapshot";
import {
  ReportJob,
  reportSnapshot,
  REPORT_PROMPT_VERSION,
} from "../src/features/personalization/ai/report.contract";
import { FINAL_PROMPT_VERSION } from "../src/features/personalization/ai/final.contract";
import { LearnerKnowledgeService } from "../src/features/retrieval/learner-knowledge.service";
import { AiProviderError } from "../src/features/ai-shared/ai-provider.error";
import { CommentValidationError } from "../src/features/personalization/ai/comment.contract";
export async function ragReportSmoke() {
  const results: any[] = [];
  await withPersonalizationDatabase(async (db, userId) => {
    const config = new ConfigService({
      ...process.env,
      PERSONALIZATION_AI_ENABLED: "true",
    });
    const generation = createGeminiServices(config, db).jsonGeneration;
    let raw = "";
    const ai = new PersonalizationAiService(config, {
      generate: async (...args: Parameters<typeof generation.generate>) => {
        const r = await generation.generate(...args);
        raw = r.text;
        return r;
      },
    } as any, new AiRequestRecorder(db));
    const documentId = randomUUID(),
      chunkId = randomUUID();
    await db.query(
      `INSERT INTO knowledge_documents(id,document_key,version_no,title,document_type,component,language_code,access_scope,status,content_hash,rights_note,created_by,metadata,usage) VALUES($1,'r5-smoke',1,'Giới từ chỉ thời gian','AUTHORED_SUMMARY','READING','vi','LEARNER','READY','synthetic','Synthetic test',$2,'{"examVariant":"ENGLISH"}','LESSON')`,
      [documentId, userId],
    );
    await db.query(
      `INSERT INTO knowledge_chunks(id,document_id,chunk_index,content,content_hash,search_vector) VALUES($1,$2,0,'Dùng on với thứ trong tuần; at với giờ cụ thể; in với tháng và năm. Đọc cả câu trước khi chọn giới từ.','synthetic',to_tsvector('simple','prepositions'))`,
      [chunkId, documentId],
    );
    const sources = await new LearnerKnowledgeService(db).sources([chunkId]);
    for (let i = 0; i < 10; i++) {
      if (i) await new Promise((r) => setTimeout(r, 13000));
      const kind = i < 4 ? "WEEKLY" : i < 7 ? "MIDTERM" : "FINAL";
      const patterns =
        i === 0
          ? []
          : [
              {
                patternId: "lesson:" + documentId,
                lessonTitle: sources[0].title,
                chunkId,
                count: i + 1,
                priorCount: i % 2,
                components: ["READING"],
                excerpt: sources[0].excerpt,
              },
            ];
      const snapshot = buildLearnerSnapshot(
        userId,
        null,
        { kind: "FINAL" },
        new Date("2026-11-01"),
        {
          attempts: [],
          scoredAttempts: [],
          reviewDates: [],
          learningCount: 0,
          mistakes: [],
          planItems: [],
        },
      );
      const job: ReportJob = {
        snapshotVersion: 6,
        promptVersion:
          kind === "FINAL" ? FINAL_PROMPT_VERSION : REPORT_PROMPT_VERSION,
        learner: reportSnapshot(
          { ...snapshot, inputHash: "synthetic", errorPatterns: patterns },
          0,
        ),
        sources: i === 0 ? [] : sources,
        candidates:
          kind === "FINAL" || i === 0
            ? []
            : [
                {
                  candidateId: "practice",
                  activityType: "TEST",
                  testId: randomUUID(),
                  title: "Luyện giới từ thời gian",
                  component: "READING",
                  purpose: "PRACTICE",
                  partNumber: 1,
                  tier: 3,
                  matchCount: 0,
                },
              ],
        plan: {
          days: kind === "FINAL" || i === 0 ? 0 : 2,
          weekIndex: 1,
          startsOn: "2026-10-25",
          endsOn: "2026-11-01",
          remainingTests: kind === "FINAL" || i === 0 ? 0 : 2,
          requiredPace: kind === "FINAL" || i === 0 ? 0 : 1,
        },
        ...(kind === "FINAL"
          ? {
              outcome: {
                lifecycle: "EXPIRED",
                testTargetReached: false,
                targetReachedOn: null,
                bandTargetStatus: "INSUFFICIENT_DATA" as const,
                endedOn: "2026-11-01",
              },
            }
          : {}),
      };
      raw = "";
      try {
        const value =
          kind === "FINAL"
            ? await ai.finalReport(userId, job)
            : await ai.report(userId, kind, job);
        results.push({
          case: i + 1,
          kind,
          status: "PASS",
          content: value.content,
        });
      } catch (e) {
        results.push({
          case: i + 1,
          kind,
          status: "FAIL",
          raw,
          reason:
            e instanceof CommentValidationError
              ? e.issues
              : e instanceof AiProviderError
                ? e.reason
                : "UNEXPECTED",
        });
      }
      console.log(
        JSON.stringify({
          ...results.at(-1),
          content: undefined,
          raw: undefined,
        }),
      );
    }
  });
  const passed = results.filter((r) => r.status === "PASS").length;
  const result = {
    at: new Date().toISOString(),
    synthetic: true,
    firstPass: true,
    attempted: 10,
    passed,
    firstPassRate: passed / 10,
    results,
  };
  const output = process.env.RAG_SMOKE_OUTPUT || "/tmp/rag-report-smoke.json";
  writeFileSync(output, JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify({
      output,
      passed,
      attempted: 10,
      firstPassRate: passed / 10,
    }),
  );
  if (passed < 9) process.exitCode = 1;
}
