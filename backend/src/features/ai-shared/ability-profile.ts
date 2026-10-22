import { learningStats } from "./learning-statistics";
import { LearningAttempt } from "./learning-statistics.types";
import { readingCefrEstimate } from "../test-attempts/policies/reading-cefr.policy";
import { SkillComponent } from "../test-attempts/types/attempt.type";

export const CEFR_LEVELS: Record<string, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C: 5,
  C1: 5,
  C2: 5,
};
export const CEFR_LABELS = ["", "A1", "A2", "B1", "B2", "C"];
export const ABILITY_SKILLS = [
  "GRAMMAR_VOCAB",
  "READING",
  "LISTENING",
  "WRITING",
  "SPEAKING",
] as const;
export interface AbilityAttempt extends LearningAttempt {
  component: SkillComponent;
  status: string;
  estimated_cefr?: string | null;
}
const average = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
/** All rows must belong to one learner. Historical cutoff is inclusive. */
export function buildAbilityProfile(
  rows: readonly AbilityAttempt[],
  asOf: Date,
) {
  const real = rows
    .filter(
      (r) =>
        r.status === "SUBMITTED" &&
        r.submitted_at &&
        new Date(r.submitted_at) <= asOf &&
        ["OBJECTIVE", "AI"].includes(r.result?.method ?? ""),
    )
    .sort(
      (a, b) =>
        new Date(b.submitted_at!).getTime() -
          new Date(a.submitted_at!).getTime() ||
        (a.id ?? "").localeCompare(b.id ?? ""),
    );
  const bySkill = ABILITY_SKILLS.map((skill) => {
    const full = real
      .filter((r) => r.component === skill && r.scope === "FULL_SKILL")
      .map((r) => ({
        row: r,
        band: readingCefrEstimate(r)?.level ?? r.estimated_cefr,
      }))
      .filter((r) => CEFR_LEVELS[r.band ?? ""])
      .slice(0, 3);
    return {
      skill,
      band: full.length
        ? CEFR_LABELS[
            Math.round(average(full.map((r) => CEFR_LEVELS[r.band!]))!)
          ]
        : null,
      status:
        full.length === 0
          ? ("NONE" as const)
          : full.length === 1
            ? ("PRELIMINARY" as const)
            : ("ESTIMATE" as const),
      sampleSize: full.length,
      lastAt: full.length
        ? new Date(full[0].row.submitted_at!).toISOString()
        : null,
    };
  });
  const main = bySkill.filter((s) => s.skill !== "GRAMMAR_VOCAB"),
    present = main.filter((s) => s.band);
  const mean = average(present.map((s) => CEFR_LEVELS[s.band!]));
  const grammar = bySkill[0].band;
  let rounded = mean === null ? null : Math.round(mean),
    tieBreak: "UP" | "DOWN" | null = null;
  if (
    present.length >= 2 &&
    mean !== null &&
    grammar &&
    Math.abs(mean - Math.floor(mean) - 0.5) <= 0.15 + Number.EPSILON
  ) {
    const up = CEFR_LEVELS[grammar] >= Math.ceil(mean);
    rounded = up ? Math.ceil(mean) : Math.floor(mean);
    tieBreak = up ? "UP" : "DOWN";
  }
  const recent = real
    .filter(
      (r) =>
        new Date(r.submitted_at!).getTime() >= asOf.getTime() - 60 * 86400000 &&
        ((r.score != null && Number(r.max_score) > 0) ||
          r.result?.method === "AI"),
    )
    .slice(0, 20);
  const statistics = learningStats(recent);
  const parts = statistics.groups.flatMap((group) => {
    const weakest = group.parts
      .filter((part) => part.attempts >= 2)
      .sort((a, b) => a.percent - b.percent || a.partNumber - b.partNumber)[0];
    return weakest
      ? [
          {
            skill: group.component,
            purpose: group.purpose,
            scope: group.scope,
            partNumber: group.partNumber,
            part: weakest.partNumber,
            percent: weakest.percent,
            attempts: weakest.attempts,
          },
        ]
      : [];
  });

  return {
    bySkill,
    overall: {
      band:
        present.length >= 2 && rounded !== null ? CEFR_LABELS[rounded] : null,
      status:
        present.length === 4
          ? ("FULL" as const)
          : present.length >= 2
            ? ("PARTIAL" as const)
            : ("NONE" as const),
      missing: main.filter((s) => !s.band).map((s) => s.skill),
      tieBreak,
    },
    weak: {
      parts,
      writingCriteria: statistics.groups.flatMap((group) =>
        group.writingCriteria.map((criterion) => ({
          ...criterion,
          purpose: group.purpose,
          scope: group.scope,
          partNumber: group.partNumber,
        })),
      ),
      speakingCriteria: statistics.groups.flatMap((group) => {
        const criteria = new Map<string, number[]>();
        for (const assessment of group.speakingCriteria)
          for (const [key, value] of Object.entries(
            assessment.percentages ?? {},
          )) {
            if (Number.isFinite(value))
              criteria.set(key, [...(criteria.get(key) ?? []), value]);
          }
        return [...criteria]
          .map(([criterion, values]) => ({
            criterion,
            percent: Math.round(average(values)!),
            observations: values.length,
            purpose: group.purpose,
            scope: group.scope,
            partNumber: group.partNumber,
          }))
          .sort((a, b) => a.percent - b.percent);
      }),
    },
  };
}
export type AbilityProfile = ReturnType<typeof buildAbilityProfile>;
