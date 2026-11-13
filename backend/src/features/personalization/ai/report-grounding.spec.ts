import { groundedTextIssues } from "./comment.contract";
import { citationIssues, errorCountIssues } from "./report-grounding";
import {
  validateWeeklyContent,
  ReportJob,
  reportSnapshot,
} from "./report.contract";
import { validateFinalContent } from "./final.contract";
import { buildLearnerSnapshot } from "../policies/learner-snapshot";
const base = buildLearnerSnapshot(
  "synthetic",
  null,
  { kind: "FINAL" },
  new Date("2026-10-01"),
  {
    attempts: [],
    scoredAttempts: [],
    reviewDates: [],
    learningCount: 0,
    mistakes: [],
    planItems: [],
  },
);
const job = (): ReportJob => ({
  snapshotVersion: 6,
  promptVersion: "test",
  learner: reportSnapshot(
    {
      ...base,
      inputHash: "fixture",
      errorPatterns: [
        {
          patternId: "lesson:d",
          lessonTitle: "Days",
          chunkId: "c",
          count: 2,
          priorCount: 0,
          components: ["READING"],
          excerpt: "Use on for days.",
        },
      ],
    },
    0,
  ),
  sources: [{ chunkId: "c", title: "Days", excerpt: "Use on for days." }],
  candidates: [],
  plan: {
    days: 0,
    weekIndex: 1,
    startsOn: "",
    endsOn: "",
    requiredPace: 0,
    remainingTests: 0,
  },
});
const report = () => ({
  statusEcho: "ON_TRACK",
  bandClaim: "NONE",
  headline: "Tiếp tục luyện tập",
  narrative: "Ghi nhận 2 lỗi.",
  wins: [],
  nextSteps: ["Ôn cách dùng giới từ."],
  citations: [{ nextStepIndex: 0, chunkId: "c" }],
});
describe("R5 grounded reports", () => {
  it("does not mistake Vietnamese Củng/Cố for CEFR C while rejecting real invented bands", () => {
    expect(
      groundedTextIssues(["Củng cố kiến thức. Cố gắng luyện tập."], {}),
    ).toEqual([]);
    for (const band of ["C", "C1", "B2"])
      expect(groundedTextIssues(["Trình độ " + band + "."], {})).toContain(
        "UNKNOWN_BAND",
      );
  });
  it.each(["WEEKLY", "MIDTERM"] as const)(
    "accepts cited %s and rejects fabricated counts",
    (kind) => {
      const r = {
        ...report(),
        ...(kind === "MIDTERM" ? { progressSoFar: "Chưa đủ dữ liệu." } : {}),
      };
      expect(
        validateWeeklyContent({ report: r, plan: { items: [] } }, kind, job()),
      ).toBeDefined();
      r.narrative = "Ghi nhận 3 lỗi.";
      expect(() =>
        validateWeeklyContent({ report: r, plan: { items: [] } }, kind, job()),
      ).toThrow();
    },
  );
  it("validates FINAL citations while preserving old shapes", () => {
    const j = job(),
      r = {
        statusEcho: "ON_TRACK",
        bandClaim: "NONE",
        headline: "Tổng kết",
        narrative: "Chưa đủ dữ liệu.",
        achievements: [],
        nextGoalSuggestion: {
          targetCefr: "B1",
          targetTests: 10,
          durationDays: 14,
        },
      };
    expect(
      validateFinalContent(
        { ...r, nextSteps: report().nextSteps, citations: report().citations },
        j,
      ),
    ).toBeDefined();
    expect(() => validateFinalContent(r, j)).toThrow();
    delete j.sources;
    expect(validateFinalContent(r, j)).toBeDefined();
  });
  it.each(
    [
      [],
      [{ nextStepIndex: 1, chunkId: "c" }],
      [{ nextStepIndex: 0, chunkId: "unknown" }],
      [{ nextStepIndex: 0, chunkId: "c", candidateId: "x" }],
      [{ nextStepIndex: 0, candidateId: "x" }],
    ].map((citations) => ({ citations })),
  )("rejects ungrounded citation %#", ({ citations }) =>
    expect(citationIssues(["Study"], citations, job()).length).toBeGreaterThan(
      0,
    ),
  );
  it("accepts no-source empty advice; requires lessons even when a candidate exists", () => {
    const j = job();
    j.candidates = [
      {
        candidateId: "t",
        activityType: "TEST",
        testId: "id",
        title: "Test",
        component: "READING",
        purpose: "PRACTICE",
      },
    ];
    expect(
      citationIssues(["Study"], [{ nextStepIndex: 0, candidateId: "t" }], j),
    ).toContain("REPORT_NEXT_STEP_UNCITED");
    expect(
      citationIssues(
        ["Study"],
        [
          { nextStepIndex: 0, chunkId: "c" },
          { nextStepIndex: 0, candidateId: "t" },
        ],
        j,
      ),
    ).toEqual([]);
    expect(
      citationIssues(
        ["Study"],
        [{ nextStepIndex: 0, chunkId: "c", candidateId: "" }],
        j,
      ),
    ).toContain("REPORT_CITATION_INVALID");
    j.sources = [];
    expect(
      citationIssues(["Study"], [{ nextStepIndex: 0, candidateId: "t" }], j),
    ).toEqual([]);
    expect(citationIssues([], [], j)).toEqual([]);
    expect(citationIssues(["Study"], [], j)).toContain(
      "REPORT_NEXT_STEP_UNCITED",
    );
  });
  it("checks exact counts, digit format and recurrence evidence", () => {
    expect(
      errorCountIssues(["3 lỗi"], [{ count: 2, priorCount: 0 }]),
    ).toContain("ERROR_PATTERN_COUNT_MISMATCH");
    expect(
      errorCountIssues(["hai lỗi"], [{ count: 2, priorCount: 0 }]),
    ).toContain("ERROR_COUNT_USE_DIGITS");
    expect(
      errorCountIssues(["Lỗi lặp lại"], [{ count: 2, priorCount: 0 }]),
    ).toContain("ERROR_PATTERN_RECURRENCE_UNSUPPORTED");
    expect(
      errorCountIssues(["2 lỗi lặp lại"], [{ count: 2, priorCount: 1 }]),
    ).toEqual([]);
  });
  it("projects only aggregates and public source metadata into prompts", () => {
    expect(JSON.stringify(job().learner)).not.toContain("Use on for days.");
    expect(job().learner.errorPatterns?.[0].count).toBe(2);
  });
});
