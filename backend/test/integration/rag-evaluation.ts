import * as assert from "node:assert/strict";
import { ConfigService } from "@nestjs/config";
import { AiRequestRecorder } from "../../src/features/ai-shared/ai-request-recorder.service";
import { JsonGenerationService } from "../../src/features/ai-shared/json-generation.service";
import { PersonalizationAiService } from "../../src/features/personalization/services/personalization-ai.service";
import { withPersonalizationDatabase } from "./personalization-fixture";

withPersonalizationDatabase(async (db, userId) => {
  const recorder = new AiRequestRecorder(db);
  let text = "invalid private response";
  let requestId = "";
  const generation = {
    generate: async () => {
      requestId = await recorder.start(
        {
          model: "fixture",
          context: {
            userId,
            purpose: "PERSONAL_WEEKLY",
            promptVersion: "test",
          },
        },
        {},
      );
      await recorder.complete(requestId, {});
      return { text, requestId };
    },
  } as unknown as JsonGenerationService;
  const service = new PersonalizationAiService(
    new ConfigService(),
    generation,
    recorder,
  );
  await assert.rejects(service.comment(userId, {}));
  let [row] = await db.query(
    "SELECT status,config_snapshot FROM ai_requests WHERE id=$1",
    [requestId],
  );
  assert.equal(row.status, "COMPLETED");
  assert.deepEqual(row.config_snapshot.validation, {
    attempt: 1,
    valid: false,
    issues: ["INVALID_JSON"],
  });
  assert.ok(!JSON.stringify(row).includes(text));
  text = JSON.stringify({
    statusEcho: "ON_TRACK",
    bandClaim: "NONE",
    summary: "Tiếp tục luyện tập.",
    strengths: [],
    focus: [],
  });
  await service.comment(userId, {}, ["INVALID_JSON"]);
  [row] = await db.query(
    "SELECT config_snapshot FROM ai_requests WHERE id=$1",
    [requestId],
  );
  assert.deepEqual(row.config_snapshot.validation, {
    attempt: 2,
    valid: true,
    issues: [],
  });
  await recorder.validation(requestId, 1, false, [
    "UNSUPPORTED_NUMBER",
    "private learner answer",
  ]);
  [row] = await db.query(
    "SELECT config_snapshot FROM ai_requests WHERE id=$1",
    [requestId],
  );
  assert.deepEqual(row.config_snapshot.validation.issues, [
    "UNSUPPORTED_NUMBER",
  ]);
  const legacy = await recorder.start(
    {
      model: "fixture",
      context: { userId, purpose: "PERSONAL_WEEKLY", promptVersion: "old" },
    },
    {},
  );
  await recorder.complete(legacy, {});
  [row] = await db.query(
    "SELECT config_snapshot FROM ai_requests WHERE id=$1",
    [legacy],
  );
  assert.equal(row.config_snapshot.validation, undefined);
  console.log(
    "R7 PASS: invalid JSON, repaired pass, provider vs validation distinction, safe codes, legacy unknown",
  );
}).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
