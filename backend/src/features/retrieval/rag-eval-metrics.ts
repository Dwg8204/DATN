export function rankingMetrics(ids: string[], relevant: Set<string>) {
  const ranked = [...new Set(ids)];
  const rank = ranked.findIndex((id) => relevant.has(id));
  return {
    recall1: relevant.size
      ? ranked.slice(0, 1).filter((id) => relevant.has(id)).length /
        relevant.size
      : null,
    recall3: relevant.size
      ? ranked.slice(0, 3).filter((id) => relevant.has(id)).length /
        relevant.size
      : null,
    recall5: relevant.size
      ? ranked.slice(0, 5).filter((id) => relevant.has(id)).length /
        relevant.size
      : null,
    mrr: relevant.size ? (rank < 0 ? 0 : 1 / (rank + 1)) : null,
  };
}
export function thresholdSweep(
  rows: Array<{ score: number; label: boolean | null; official: boolean }>,
) {
  return Array.from({ length: 9 }, (_, i) => {
    const threshold = (50 + i * 5) / 100,
      chosen = rows.filter((r) => r.score >= threshold),
      judged = chosen.filter((r) => r.label !== null),
      correct = judged.filter((r) => r.label === true).length;
    return {
      threshold,
      retrieved: chosen.length,
      judged: judged.length,
      unknown: chosen.length - judged.length,
      precision: judged.length ? correct / judged.length : null,
      eligible:
        chosen.length > 0 &&
        chosen.every((r) => r.official && r.label !== null),
    };
  });
}
export function chooseThreshold(rows: ReturnType<typeof thresholdSweep>) {
  return (
    rows.find((r) => r.eligible && r.precision !== null && r.precision >= 0.8)
      ?.threshold ?? null
  );
}
