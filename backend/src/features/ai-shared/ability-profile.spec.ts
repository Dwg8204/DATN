import { AbilityAttempt, buildAbilityProfile } from "./ability-profile";
const now = new Date("2026-10-22T12:00:00Z");
const row = (
  component: AbilityAttempt["component"] = "READING",
  band = "B1",
  patch: Partial<AbilityAttempt> = {},
): AbilityAttempt => ({
  id: "a",
  component,
  status: "SUBMITTED",
  scope: "FULL_SKILL",
  purpose: "EXAM",
  submitted_at: "2026-10-21T12:00:00Z",
  score: 5,
  max_score: 10,
  estimated_cefr: band,
  result: {
    method: "OBJECTIVE",
    parts: [{ partNumber: 1, score: 5, maxScore: 10 }],
  },
  ...patch,
});
const profile = (rows: AbilityAttempt[]) => buildAbilityProfile(rows, now);
const reading = (rows: AbilityAttempt[]) =>
  profile(rows).bySkill.find((s) => s.skill === "READING")!;
it.each([0, 1, 2, 3, 5])("uses at most three full attempts, sample %i", (n) => {
  const r = reading(
    Array.from({ length: n }, (_, i) =>
      row("READING", "B1", { id: String(i) }),
    ),
  );
  expect(r.sampleSize).toBe(Math.min(n, 3));
  expect(r.status).toBe(
    n === 0 ? "NONE" : n === 1 ? "PRELIMINARY" : "ESTIMATE",
  );
  expect(r.band).toBe(n ? "B1" : null);
});
it("uses only the latest three, independent of input order", () => {
  const rows = Array.from({ length: 5 }, (_, i) =>
    row("READING", i < 2 ? "A1" : "B2", {
      id: String(i),
      submitted_at: new Date(now.getTime() - (5 - i) * 86400000),
    }),
  );
  expect(reading(rows).band).toBe("B2");
  expect(profile(rows)).toEqual(profile([...rows].reverse()));
});
it("includes Writing and excludes grammar from the four skill mean", () => {
  const p = profile([
    row("READING", "B2"),
    row("LISTENING", "B2"),
    row("WRITING", "A2"),
    row("SPEAKING", "A2"),
    row("GRAMMAR_VOCAB", "C"),
  ]);
  expect(p.overall).toMatchObject({
    band: "B1",
    status: "FULL",
    missing: [],
    tieBreak: null,
  });
});
it("marks three skills partial and names the missing skill", () =>
  expect(
    profile([row("READING"), row("LISTENING"), row("SPEAKING")]).overall,
  ).toMatchObject({ band: "B1", status: "PARTIAL", missing: ["WRITING"] }));
it("requires at least two main skills even with grammar", () =>
  expect(
    profile([row("READING"), row("GRAMMAR_VOCAB")]).overall.band,
  ).toBeNull());
it("breaks a borderline mean upward with grammar", () =>
  expect(
    profile([
      row("READING", "A2"),
      row("LISTENING", "B1"),
      row("GRAMMAR_VOCAB", "B1"),
    ]).overall,
  ).toMatchObject({ band: "B1", tieBreak: "UP" }));
it("breaks a borderline mean downward with grammar", () =>
  expect(
    profile([
      row("READING", "A2"),
      row("LISTENING", "B1"),
      row("GRAMMAR_VOCAB", "A2"),
    ]).overall,
  ).toMatchObject({ band: "A2", tieBreak: "DOWN" }));
it("rounds normally outside the border region", () =>
  expect(
    profile([
      row("READING", "B1"),
      row("LISTENING", "B1"),
      row("SPEAKING", "A2"),
      row("GRAMMAR_VOCAB", "A1"),
    ]).overall,
  ).toMatchObject({ band: "B1", tieBreak: null }));
it.each(["SIMULATED", "UNASSESSED", "PENDING_AI"])("excludes %s", (method) =>
  expect(reading([row("READING", "C", { result: { method } })]).status).toBe(
    "NONE",
  ),
);
it("uses Reading estimate from all four parts instead of stale CEFR", () =>
  expect(
    reading([
      row("READING", "A1", {
        score: 8,
        max_score: 10,
        result: {
          method: "OBJECTIVE",
          parts: [1, 2, 3, 4].map((partNumber) => ({
            partNumber,
            maxScore: 10,
            score: 8,
          })),
        },
      }),
    ]).band,
  ).toBe("B2"));
it("ignores future and unsubmitted attempts", () =>
  expect(
    reading([
      row("READING", "C", { submitted_at: "2026-10-23" }),
      row("READING", "C", { status: "IN_PROGRESS" }),
    ]).sampleSize,
  ).toBe(0));
it("Part evidence never supplies a full skill band", () =>
  expect(
    reading([row("READING", "C", { scope: "PART", part_number: 1 })]).band,
  ).toBeNull());
it("uses only 20 recent scored attempts for weaknesses", () => {
  const rows = Array.from({ length: 25 }, (_, i) =>
    row("READING", "B1", {
      id: String(i),
      submitted_at: new Date(now.getTime() - (i + 1) * 86400000),
    }),
  );
  expect(profile(rows).weak.parts[0].attempts).toBe(20);
});
it("old full evidence still supplies band but not recent weaknesses", () => {
  const rows = [
    row("READING", "B1", { submitted_at: "2026-07-01" }),
    row("READING", "B1", { submitted_at: "2026-07-02" }),
  ];
  expect(reading(rows).band).toBe("B1");
  expect(profile(rows).weak.parts).toEqual([]);
});

it("recognizes scored full grammar placement without inventing a CEFR band", () => {
  const grammar = row("GRAMMAR_VOCAB", "B1", {
    estimated_cefr: null,
    score: 0,
    max_score: 50,
  });
  expect(profile([grammar]).bySkill[0]).toMatchObject({
    assessmentComplete: true,
    band: null,
    status: "NONE",
  });
  for (const patch of [
    { scope: "PART" },
    { status: "IN_PROGRESS" },
    { score: null },
    { max_score: 0 },
    { score: 51 },
    { result: { method: "PENDING_AI" } },
    { result: { method: "SIMULATED" } },
  ]) {
    expect(
      profile([{ ...grammar, ...patch }]).bySkill[0].assessmentComplete,
    ).toBe(false);
  }
});
