import { allocatePlanProgress, ProgressAttempt } from "./plan-progress";
import { StudyPlanItemRow } from "../types/personalization.type";
const task = (
  id: string,
  day: string,
  patch: Partial<StudyPlanItemRow> = {},
): StudyPlanItemRow => ({
  id,
  plan_id: "p",
  scheduled_on: day,
  sort_order: 0,
  activity_type: "TEST",
  component: "READING",
  part_number: null,
  test_id: "full",
  topic_id: null,
  source_attempt_id: null,
  question_keys: null,
  target_count: 1,
  done_count: 0,
  completed_at: null,
  reason: null,
  ...patch,
});
const run = (
  tasks: StudyPlanItemRow[],
  attempts: ProgressAttempt[] = [],
  reviews: Date[] = [],
) =>
  allocatePlanProgress(
    tasks,
    attempts,
    reviews,
    "2026-10-01",
    "2026-10-07",
    "Asia/Bangkok",
  );
const attempt = (patch = {}) => ({
  id: "a",
  test_id: "full",
  component: "READING",
  part_number: null,
  submitted_at: new Date("2026-10-01T05:00Z"),
  ...patch,
});
it("credits a Tuesday task completed on Monday within the week", () =>
  expect(run([task("t", "2026-10-02")], [attempt()])[0].doneCount).toBe(1));
it("credits a task caught up later within the same week", () =>
  expect(
    run(
      [task("t", "2026-10-01")],
      [attempt({ submitted_at: new Date("2026-10-06T05:00Z") })],
    )[0].doneCount,
  ).toBe(1));
it("does not credit another Part within the same test", () =>
  expect(
    run(
      [task("t", "2026-10-01", { part_number: 2 })],
      [attempt({ part_number: 1 })],
    )[0].doneCount,
  ).toBe(0));
it("does not credit a different test of the same skill", () =>
  expect(
    run([task("t", "2026-10-01")], [attempt({ test_id: "other" })])[0]
      .doneCount,
  ).toBe(0));
it("does not credit a Part attempt towards a full test task", () =>
  expect(
    run([task("t", "2026-10-01")], [attempt({ part_number: 1 })])[0].doneCount,
  ).toBe(0));
it("never borrows an attempt from the previous week", () =>
  expect(
    run(
      [task("t", "2026-10-01")],
      [attempt({ submitted_at: new Date("2026-09-30T05:00Z") })],
    )[0].doneCount,
  ).toBe(0));
it("allocates early vocabulary reviews once to the earliest days", () => {
  const tasks = [
    task("late", "2026-10-03", {
      activity_type: "VOCAB_REVIEW",
      target_count: 10,
    }),
    task("early", "2026-10-02", {
      activity_type: "VOCAB_REVIEW",
      target_count: 10,
    }),
  ];
  expect(
    run(
      tasks,
      [],
      Array.from({ length: 15 }, () => new Date("2026-10-01T05:00Z")),
    ).map((x) => [x.id, x.doneCount]),
  ).toEqual([
    ["early", 10],
    ["late", 5],
  ]);
});
