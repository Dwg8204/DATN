import { rankTestCandidates, RankableTest } from "./rank-test-candidates";
import { PlanRetrieval } from "../types/personalization.type";
import { retrievalReasonIssues } from "../ai/report.contract";

const row = (id: string, part = 1, used = false, seed = id): RankableTest => ({
  id,
  component: "READING",
  part_number: part,
  used,
  random_seed: seed,
  purpose: "PRACTICE",
});
const trace = (matchCount: number, score: number): PlanRetrieval => ({
  tier: 1,
  matchCount,
  score,
  matchedTopics: [],
});
describe("R3 rank tests", () => {
  it("keeps the exact legacy weak-part, used, seed, ID ordering without matches", () => {
    const input = [
      row("d", 2),
      row("c", 1, true),
      row("b", 1, false, "a"),
      row("a", 1, false, "a"),
    ];
    expect(
      rankTestCandidates(
        input,
        ["READING"],
        [{ skill: "READING", part: 1 }],
      ).map((t) => t.id),
    ).toMatchInlineSnapshot(`
[
  "a",
  "b",
  "c",
  "d",
]
`);
    expect(input.map((t) => t.id)).toEqual(["d", "c", "b", "a"]);
  });
  it("prioritizes placement, tier, distinct match count, score, then unused and seed", () => {
    const input = [
      row("a"),
      row("b"),
      row("c", 2),
      row("d", 2, true),
      { ...row("p"), purpose: "PLACEMENT" },
    ];
    const map = new Map([
      ["b", trace(2, 1.8)],
      ["c", trace(3, 2.4)],
      ["d", trace(3, 2.4)],
    ]);
    expect(
      rankTestCandidates(
        input,
        ["READING"],
        [{ skill: "READING", part: 1 }],
        map,
      ).map((t) => t.id),
    ).toEqual(["p", "c", "d", "b", "a"]);
  });
  it("uses similarity before used and preserves weak-skill rotation", () => {
    const input = [
      row("a"),
      row("b", 1, true),
      { ...row("c"), component: "WRITING" },
    ];
    expect(
      rankTestCandidates(
        input,
        ["WRITING", "READING"],
        [],
        new Map([
          ["a", trace(2, 1.6)],
          ["b", trace(2, 1.8)],
        ]),
      ).map((t) => t.id),
    ).toEqual(["c", "b", "a"]);
  });
});
describe("R3 grounded plan reasons", () => {
  it.each([
    "Tương tự 2 câu sai",
    "Cùng dạng câu",
    "Giống lỗi gần đây",
    "Similar questions",
    "Khớp 2 câu",
  ])("rejects unsupported claim: %s", (reason) => {
    expect(retrievalReasonIssues(reason, 0)).toEqual([
      "REASON_CLAIMS_SIMILARITY",
    ]);
  });
  it.each(["Tương tự 3 câu sai", "Similar 3 questions"])(
    "accepts the exact count: %s",
    (reason) => {
      expect(retrievalReasonIssues(reason, 3)).toEqual([]);
    },
  );
  it.each(["Tương tự 2 câu", "Tương tự nhiều câu", "Similar 3.5 questions"])(
    "rejects incorrect or omitted count: %s",
    (reason) => {
      expect(retrievalReasonIssues(reason, 3)).toEqual([
        "REASON_MATCH_COUNT_MISMATCH",
      ]);
    },
  );
});
