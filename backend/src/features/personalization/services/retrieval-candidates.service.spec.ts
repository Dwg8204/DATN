import { ConfigService } from "@nestjs/config";
import { RetrievalCandidatesService } from "./retrieval-candidates.service";

describe("RetrievalCandidatesService", () => {
  const snapshot: any = {
    mistakes: {
      references: [
        { attemptId: "a", questionKey: "p1:q1", component: "READING" },
        { attemptId: "a", questionKey: "p1:q2", component: "READING" },
      ],
    },
  };
  const source = (id: string, key: string) => ({
    question_id: id,
    test_id: "source",
    component: "READING",
    vector: "[1,0]",
    attemptId: "a",
    questionKey: key,
  });
  it("does no retrieval or database work when disabled", async () => {
    const manager: any = { query: jest.fn() },
      search: any = { similar: jest.fn() };
    expect(
      (
        await new RetrievalCandidatesService(
          new ConfigService({ PERSONALIZATION_RAG_ENABLED: false }),
          search,
        ).rankTests(manager, "user", snapshot)
      ).size,
    ).toBe(0);
    expect(manager.query).not.toHaveBeenCalled();
    expect(search.similar).not.toHaveBeenCalled();
  });
  it("counts distinct source questions, sums best similarity, excludes source test and caps trace", async () => {
    const manager: any = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          source("q1", "p1:q1"),
          source("q1", "p1:q1"),
          source("q2", "p1:q2"),
        ])
        .mockResolvedValue([{ name: "Conditionals" }]),
    };
    const search: any = {
      similar: jest.fn().mockResolvedValue([
        { test_id: "target", questionId: "m1", similarity: 0.8 },
        { test_id: "target", questionId: "m2", similarity: 0.9 },
      ]),
    };
    const result = await new RetrievalCandidatesService(
      new ConfigService({ PERSONALIZATION_RAG_ENABLED: true }),
      search,
    ).rankTests(manager, "user", snapshot);
    expect(result.get("target")).toMatchObject({
      tier: 1,
      matchCount: 2,
      score: 1.8,
      matchedTopics: ["Conditionals"],
    });
    expect(search.similar).toHaveBeenCalledTimes(2);
    expect(search.similar.mock.calls[0][1]).toMatchObject({
      excludeTestIds: ["source"],
      regularOnly: true,
      perSource: 10,
      minSimilarity: 0.75,
    });
    expect(manager.query).toHaveBeenCalledTimes(2);
  });
  it("records only one gap per objective skill if old snapshots cannot map", async () => {
    const manager: any = { query: jest.fn().mockResolvedValue([]) },
      search: any = { similar: jest.fn() };
    await new RetrievalCandidatesService(
      new ConfigService({ PERSONALIZATION_RAG_ENABLED: true }),
      search,
    ).rankTests(manager, "user", snapshot);
    expect(manager.query).toHaveBeenCalledTimes(2);
    expect(manager.query.mock.calls[1][1]).toEqual(["user", "READING"]);
    expect(search.similar).not.toHaveBeenCalled();
  });
});
