import { PlanRetrieval } from "../types/personalization.type";

export interface RankableTest {
  id: string;
  component: string;
  part_number: number | null;
  purpose: string;
  used: boolean;
  random_seed: string;
}

// Keep skill rotation and the legacy tie-breaks; retrieval only changes priority within a skill.
export function rankTestCandidates<T extends RankableTest>(
  tests: readonly T[],
  skillOrder: readonly string[],
  weakParts: readonly { skill: string; part: number }[],
  matches: ReadonlyMap<string, PlanRetrieval> = new Map(),
): T[] {
  const weak = (t: T) =>
    weakParts.some((p) => p.skill === t.component && p.part === t.part_number);
  const tier = (t: T) => matches.get(t.id)?.tier ?? (weak(t) ? 3 : 4);
  return [...tests].sort(
    (a, b) =>
      Number(b.purpose === "PLACEMENT") - Number(a.purpose === "PLACEMENT") ||
      skillOrder.indexOf(a.component) - skillOrder.indexOf(b.component) ||
      tier(a) - tier(b) ||
      (matches.get(b.id)?.matchCount ?? 0) -
        (matches.get(a.id)?.matchCount ?? 0) ||
      (matches.get(b.id)?.score ?? 0) - (matches.get(a.id)?.score ?? 0) ||
      Number(a.used) - Number(b.used) ||
      a.random_seed.localeCompare(b.random_seed) ||
      a.id.localeCompare(b.id),
  );
}
