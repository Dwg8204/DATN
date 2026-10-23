import { claimContext } from "../ai/state-claims";
import { Injectable } from "@nestjs/common";
import {
  FINAL_PROMPT_VERSION,
  FINAL_SCHEMA,
  FINAL_SYSTEM,
  validateFinalContent,
} from "../ai/final.contract";
import { ConfigService } from "@nestjs/config";
import { JsonGenerationService } from "../../ai-shared/json-generation.service";
import { AiProviderError } from "../../ai-shared/ai-provider.error";
import { createHash } from "node:crypto";
import {
  COMMENT_PROMPT_VERSION,
  COMMENT_SCHEMA,
  COMMENT_SYSTEM,
  CommentValidationError,
  validateComment,
} from "../ai/comment.contract";
import {
  REPORT_PROMPT_VERSION,
  REPORT_SYSTEM,
  ReportJob,
  ReportKind,
  reportPromptInput,
  reportSchema,
  validateWeeklyContent,
} from "../ai/report.contract";

@Injectable()
export class PersonalizationAiService {
  constructor(
    private readonly config: ConfigService,
    private readonly generation: JsonGenerationService,
  ) {}
  get enabled(): boolean {
    return (
      String(this.config.get("PERSONALIZATION_AI_ENABLED", false)) === "true"
    );
  }
  get maxRpm(): number {
    return Number(this.config.get("PERSONALIZATION_MAX_RPM", 5));
  }
  get configurationKey(): string {
    return createHash("sha256")
      .update(
        JSON.stringify({
          provider: this.config.get("PERSONALIZATION_PROVIDER", "gemini"),
          model:
            this.config.get("PERSONALIZATION_MODEL") ||
            this.config.get("CHATBOT_MODEL", "gemini-3.5-flash-lite"),
          promptVersion: REPORT_PROMPT_VERSION,
          finalPromptVersion: FINAL_PROMPT_VERSION,
        }),
      )
      .digest("hex");
  }

  async comment(
    userId: string,
    snapshot: Record<string, unknown>,
    issues: string[] = [],
  ) {
    const result = await this.generate(
      userId,
      "PERSONAL_COMMENT",
      COMMENT_PROMPT_VERSION,
      COMMENT_SYSTEM,
      COMMENT_SCHEMA,
      { snapshot, validationContext: claimContext(snapshot) },
      issues,
      2048,
    );
    return {
      content: validateComment(result.parsed, snapshot),
      requestId: result.requestId,
    };
  }

  async report(
    userId: string,
    kind: ReportKind,
    job: ReportJob,
    issues: string[] = [],
  ) {
    const result = await this.generate(
      userId,
      kind === "PLAN_START" ? "PERSONAL_PLAN" : "PERSONAL_WEEKLY",
      REPORT_PROMPT_VERSION,
      REPORT_SYSTEM,
      reportSchema(kind),
      reportPromptInput(kind, job),
      issues,
      8192,
    );
    return {
      content: validateWeeklyContent(result.parsed, kind, job),
      requestId: result.requestId,
    };
  }

  async finalReport(userId: string, job: ReportJob, issues: string[] = []) {
    const result = await this.generate(
      userId,
      "PERSONAL_FINAL",
      FINAL_PROMPT_VERSION,
      FINAL_SYSTEM,
      FINAL_SCHEMA,
      {
        snapshot: job.learner,
        outcome: job.outcome,
        validationContext: claimContext(job.learner, job.outcome),
      },
      issues,
      2048,
    );
    return {
      content: validateFinalContent(result.parsed, job),
      requestId: result.requestId,
    };
  }

  private async generate(
    userId: string,
    purpose: string,
    promptVersion: string,
    system: string,
    schema: Record<string, unknown>,
    input: Record<string, unknown>,
    issues: string[],
    maxOutputTokens: number,
  ) {
    const provider = this.config.get<string>(
      "PERSONALIZATION_PROVIDER",
      "gemini",
    );
    const model =
      this.config.get<string>("PERSONALIZATION_MODEL") ||
      (provider === "gemini"
        ? this.config.get<string>("CHATBOT_MODEL", "gemini-3.5-flash-lite")
        : "");
    if (!model) throw new AiProviderError("CONFIG_INVALID");
    const result = await this.generation.generate(
      {
        model,
        provider,
        system,
        temperature: 0.2,
        maxOutputTokens,
        schema,
        prompt: JSON.stringify({
          ...input,
          ...(issues.length ? { validationErrors: issues } : {}),
        }),
        context: {
          userId,
          purpose,
          promptVersion,
          errorCodePrefix: "PERSONALIZATION",
        },
      },
      AbortSignal.timeout(
        Number(this.config.get("PERSONALIZATION_AI_TIMEOUT_MS", 20_000)),
      ),
    );
    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      throw new CommentValidationError(["INVALID_JSON"]);
    }
    return {
      parsed,
      requestId: result.requestId,
    };
  }
}
