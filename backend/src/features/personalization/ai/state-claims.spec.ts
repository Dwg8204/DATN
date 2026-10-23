import { buildLearnerSnapshot } from "../policies/learner-snapshot";
import {
  validateComment,
  commentSnapshot,
  COMMENT_SCHEMA,
} from "./comment.contract";
import {
  reportSnapshot,
  ReportJob,
  validateWeeklyContent,
  reportSchema,
} from "./report.contract";
import { validateFinalContent, FINAL_SCHEMA } from "./final.contract";
const base = buildLearnerSnapshot(
  "fixture",
  null,
  { kind: "GOAL" },
  new Date("2026-10-23T00:00Z"),
  {
    attempts: [],
    scoredAttempts: [],
    reviewDates: [],
    learningCount: 0,
    mistakes: [],
    planItems: [],
  },
);
function job(): ReportJob {
  const learner = reportSnapshot({ ...base, inputHash: "fixture" }, 0);
  learner.goal = { status: "BEHIND" } as NonNullable<typeof learner.goal>;
  learner.band.target = "B2";
  learner.band.overallEstimate = "A2";
  return {
    snapshotVersion: 4,
    promptVersion: "test",
    learner,
    candidates: [],
    plan: {
      weekIndex: 1,
      startsOn: "",
      endsOn: "",
      days: 0,
      requiredPace: 0,
      remainingTests: 0,
    },
    outcome: {
      lifecycle: "EXPIRED",
      testTargetReached: false,
      targetReachedOn: null,
      bandTargetStatus: "NOT_REACHED",
      endedOn: "2026-10-23",
    },
  };
}
const claims = { statusEcho: "BEHIND", bandClaim: "NONE" };
function validate(
  kind: string,
  text: string,
  fields: Record<string, unknown> = claims,
  input = job(),
) {
  if (kind === "COMMENT")
    return validateComment(
      { ...fields, summary: text, strengths: [], focus: [] },
      input.learner,
    );
  if (kind === "FINAL")
    return validateFinalContent(
      {
        ...fields,
        headline: "Tổng kết",
        narrative: text,
        achievements: [],
        nextGoalSuggestion: {
          targetCefr: "B2",
          targetTests: 40,
          durationDays: 30,
        },
      },
      input,
    );
  return validateWeeklyContent(
    {
      plan: { items: [] },
      report: {
        ...fields,
        headline: "Báo cáo",
        narrative: text,
        wins: [],
        nextSteps: [],
        ...(kind === "MIDTERM" ? { progressSoFar: "Tiếp tục luyện tập." } : {}),
      },
    },
    kind as "WEEKLY" | "MIDTERM",
    input,
  );
}
describe.each(["COMMENT", "WEEKLY", "MIDTERM", "FINAL"])(
  "%s state consistency",
  (kind) => {
    it.each([
      "Bạn đang vượt tiến độ",
      "Bạn đã đạt B2",
      "Bạn đã đạt được band B2",
      "Bạn đang đúng tiến độ.",
    ])("rejects contradiction even with honest metadata: %s", (text) =>
      expect(() => validate(kind, text)).toThrow(),
    );
    it("rejects missing metadata, wrong echo, unsupported CURRENT and premature TARGET_REACHED", () => {
      for (const fields of [
        {},
        { ...claims, statusEcho: "AHEAD" },
        { ...claims, bandClaim: "TARGET_REACHED" },
      ])
        expect(() => validate(kind, "Tiếp tục luyện tập.", fields)).toThrow();
      const input = job();
      input.learner.band.overallEstimate = null;
      expect(() =>
        validate(
          kind,
          "Tiếp tục luyện tập.",
          { ...claims, bandClaim: "CURRENT" },
          input,
        ),
      ).toThrow();
    });
    it("accepts grounded current band, future goals and negated progress", () => {
      expect(() =>
        validate(kind, "Band ước lượng hiện tại là A2.", {
          ...claims,
          bandClaim: "CURRENT",
        }),
      ).not.toThrow();
      expect(() => validate(kind, "Hãy luyện tập để đạt B2.")).not.toThrow();
      expect(() => validate(kind, "Bạn chưa vượt tiến độ.")).not.toThrow();
    });
    it("accepts TARGET_REACHED only with code-derived achievement", () => {
      const input = job();
      input.learner.band.overallEstimate = "B2";
      input.outcome!.bandTargetStatus = "REACHED";
      expect(() =>
        validate(
          kind,
          "Bạn đã đạt B2.",
          { ...claims, bandClaim: "TARGET_REACHED" },
          input,
        ),
      ).not.toThrow();
    });
    it.each(["AHEAD", "ON_TRACK", "BEHIND"])(
      "checks %s text and echo",
      (status) => {
        const input = job();
        input.learner.goal!.status = status as "AHEAD";
        const text = {
          AHEAD: "Bạn đang vượt tiến độ.",
          ON_TRACK: "Bạn đang đúng tiến độ.",
          BEHIND: "Bạn đang chậm tiến độ.",
        }[status]!;
        expect(() =>
          validate(kind, text, { ...claims, statusEcho: status }, input),
        ).not.toThrow();
      },
    );
  },
);
it("requires claims in all narrative schemas but leaves PLAN_START intact", () => {
  expect(COMMENT_SCHEMA.required).toEqual(
    expect.arrayContaining(["statusEcho", "bandClaim"]),
  );
  expect(FINAL_SCHEMA.required).toEqual(
    expect.arrayContaining(["statusEcho", "bandClaim"]),
  );
  expect(reportSchema("WEEKLY").properties.report?.required).toEqual(
    expect.arrayContaining(["statusEcho", "bandClaim"]),
  );
  expect(reportSchema("PLAN_START").required).toEqual(["plan"]);
  const snapshot = commentSnapshot({ ...base, inputHash: "fixture" });
  expect(() =>
    validateComment(
      {
        statusEcho: "ON_TRACK",
        bandClaim: "NONE",
        summary: "Tiếp tục luyện tập.",
        strengths: [],
        focus: [],
      },
      snapshot,
    ),
  ).not.toThrow();
  expect(() =>
    validateComment(
      {
        statusEcho: "ON_TRACK",
        bandClaim: "NONE",
        summary: "Bạn đang đúng tiến độ.",
        strengths: [],
        focus: [],
      },
      snapshot,
    ),
  ).toThrow();
});
