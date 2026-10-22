import { StudyPlanItemRow } from "../types/personalization.type";
import { localDay } from "./calendar";

export interface ProgressAttempt {
  id: string;
  component: string;
  part_number: number | null;
  submitted_at: Date;
  test_id?: string;
  topic_ids?: string[];
}

/** Allocate each attempt once, to the earliest eligible task in this plan. */
export function allocatePlanProgress(
  items: StudyPlanItemRow[],
  attempts: ProgressAttempt[],
  reviews: Date[],
  startsOn: string,
  endsOn: string,
  timezone: string,
) {
  const used = new Set<string>();
  const reviewPool = reviews
    .filter(
      (date) =>
        localDay(date, timezone) >= startsOn &&
        localDay(date, timezone) <= endsOn,
    )
    .sort((a, b) => a.getTime() - b.getTime());
  let reviewCursor = 0;
  const orderedAttempts = [...attempts].sort(
    (a, b) =>
      a.submitted_at.getTime() - b.submitted_at.getTime() ||
      a.id.localeCompare(b.id),
  );
  return [...items]
    .sort(
      (a, b) =>
        a.scheduled_on.localeCompare(b.scheduled_on) ||
        a.sort_order - b.sort_order ||
        a.id.localeCompare(b.id),
    )
    .map((item) => {
      let dates: Date[];
      if (
        item.activity_type === "TEST" ||
        item.activity_type === "TOPIC_REVIEW"
      ) {
        const matches = orderedAttempts
          .filter(
            (attempt) =>
              !used.has(attempt.id) &&
              !!item.test_id &&
              attempt.test_id === item.test_id &&
              (attempt.part_number === null ||
                (item.part_number !== null &&
                  attempt.part_number === item.part_number)) &&
              (item.activity_type !== "TOPIC_REVIEW" ||
                !!attempt.topic_ids?.includes(item.topic_id!)) &&
              localDay(attempt.submitted_at, timezone) >= startsOn &&
              localDay(attempt.submitted_at, timezone) <= endsOn,
          )
          .slice(0, item.target_count);
        matches.forEach((attempt) => used.add(attempt.id));
        dates = matches.map((attempt) => attempt.submitted_at);
      } else if (item.activity_type === "VOCAB_REVIEW") {
        dates = reviewPool.slice(
          reviewCursor,
          reviewCursor + item.target_count,
        );
        reviewCursor += dates.length;
      } else
        return {
          id: item.id,
          doneCount: item.done_count,
          completedAt: item.completed_at,
        };
      return {
        id: item.id,
        doneCount: dates.length,
        completedAt:
          dates.length === item.target_count
            ? (item.completed_at ?? dates.at(-1)!)
            : null,
      };
    });
}
