import { writingErrors } from "./learner-error-text";
import { groupErrorPatterns } from "../personalization/services/error-patterns.service";
describe("R5 learner errors", () => {
  it("extracts at most ten findings without copying answer fields", () => {
    const result = {
      writing: {
        details: {
          parts: [
            {
              partNumber: 1,
              questions: [
                {
                  questionKey: "p1:q1",
                  original: "PRIVATE",
                  suggestedRevision: "PRIVATE",
                  corrections: [
                    { kind: "SUGGESTION", explanation: "Ignore" },
                    ...Array.from({ length: 12 }, (_, i) => ({
                      kind: "ERROR",
                      criterion: "GRAMMAR",
                      explanation: "Finding " + i,
                      original: "PRIVATE",
                      replacement: "PRIVATE",
                      evidence: ["PRIVATE"],
                    })),
                  ],
                },
                {
                  responseStatus: "BLANK",
                  corrections: [{ kind: "ERROR", explanation: "Blank" }],
                },
              ],
            },
          ],
        },
      },
    };
    const rows = writingErrors(result);
    expect(rows).toHaveLength(10);
    expect(JSON.stringify(rows)).not.toContain("PRIVATE");
    expect(rows[0].sourceKind).toBe("WRITING_CORRECTION");
  });
  it("deduplicates feedback and ignores malformed/blank input", () => {
    expect(writingErrors(null)).toEqual([]);
    expect(
      writingErrors({
        writing: {
          details: {
            parts: [
              {
                partNumber: 1,
                questions: [
                  {
                    questionKey: "q",
                    corrections: [
                      {
                        kind: "ERROR",
                        criterion: "GRAMMAR",
                        explanation: "Same",
                      },
                    ],
                    weaknesses: [{ criterion: "GRAMMAR", comment: "Same" }],
                  },
                ],
              },
            ],
          },
        },
      }),
    ).toHaveLength(1);
  });
  it("groups chunks by lesson, counts prior occurrences separately and takes top five current groups", () => {
    const rows = Array.from({ length: 7 }, (_, i) => ({
      documentId: "d" + i,
      chunkId: "c" + i,
      title: "Lesson",
      excerpt: "x".repeat(500),
      component: "READING",
      current: true,
    }));
    rows.push({ ...rows[0], chunkId: "alternate", component: "WRITING" });
    rows.push({ ...rows[0], current: false });
    rows.push({ ...rows[0], documentId: "old-only", current: false });
    const groups = groupErrorPatterns(rows);
    expect(groups).toHaveLength(5);
    expect(groups[0]).toMatchObject({
      count: 2,
      priorCount: 1,
      components: ["READING", "WRITING"],
    });
    expect(groups[0].excerpt).toHaveLength(400);
    expect(groups.some((g) => g.patternId === "lesson:old-only")).toBe(false);
  });
});
