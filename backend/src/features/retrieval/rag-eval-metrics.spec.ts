import {
  rankingMetrics,
  thresholdSweep,
  chooseThreshold,
} from "./rag-eval-metrics";
describe("R7 evaluation metrics", () => {
  it("uses recall fraction, deduplication and reciprocal first relevant rank", () => {
    expect(rankingMetrics(["x", "a", "a", "b"], new Set(["a", "b"]))).toEqual({
      recall1: 0,
      recall3: 1,
      recall5: 1,
      mrr: 0.5,
    });
    expect(rankingMetrics([], new Set())).toEqual({
      recall1: null,
      recall3: null,
      recall5: null,
      mrr: null,
    });
  });
  it("does not call unjudged candidates negatives or tune from nonofficial labels", () => {
    const sweep = thresholdSweep([
      { score: 0.8, label: true, official: false },
      { score: 0.7, label: null, official: false },
    ]);
    expect(sweep[0]).toMatchObject({
      retrieved: 2,
      judged: 1,
      unknown: 1,
      precision: 1,
      eligible: false,
    });
    expect(chooseThreshold(sweep)).toBeNull();
  });
  it("chooses the lowest fully judged threshold meeting precision", () => {
    const sweep = thresholdSweep([
      { score: 0.8, label: true, official: true },
      { score: 0.55, label: false, official: true },
    ]);
    expect(chooseThreshold(sweep)).toBe(0.6);
  });
});
