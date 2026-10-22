import { SkillComponent } from "../../test-attempts/types/attempt.type";
import { CreatePlanItemInput } from "../types/personalization.type";
import { addDays, dayNumber } from "./calendar";

export type PlanCandidate =
  | {
      candidateId: string;
      activityType: "TOPIC_REVIEW";
      topicId: string;
      topicName: string;
      testId: string;
      component: SkillComponent;
      partNumber?: number;
      purpose: string;
      title: string;
    }
  | {
      candidateId: string;
      activityType: "TEST";
      testId: string;
      component: SkillComponent;
      partNumber?: number;
      purpose: string;
      title: string;
    }
  | {
      candidateId: string;
      activityType: "VOCAB_REVIEW";
      targetCount: 10 | 20 | 30;
    }
  | {
      candidateId: string;
      activityType: "MISTAKE_REVIEW";
      sourceAttemptId: string;
      questionKeys: string[];
      component: SkillComponent;
    };

export function buildRulePlan(
  candidates: PlanCandidate[],
  startsOn: string,
  endsOn: string,
  requiredPace: number,
  remainingTests: number,
): CreatePlanItemInput[] {
  const tests = candidates.filter(
    (item): item is Extract<PlanCandidate, { activityType: "TEST" }> =>
      item.activityType === "TEST",
  );
  const mistakes = candidates.filter(
    (
      item,
    ): item is Extract<PlanCandidate, { activityType: "MISTAKE_REVIEW" }> =>
      item.activityType === "MISTAKE_REVIEW",
  );
  const topics = candidates.filter(
    (item): item is Extract<PlanCandidate, { activityType: "TOPIC_REVIEW" }> =>
      item.activityType === "TOPIC_REVIEW",
  );
  const vocab = candidates
    .filter(
      (
        item,
      ): item is Extract<PlanCandidate, { activityType: "VOCAB_REVIEW" }> =>
        item.activityType === "VOCAB_REVIEW" && item.targetCount <= 20,
    )
    .sort((a, b) => b.targetCount - a.targetCount)[0];
  const skills = [...new Set(tests.map((item) => item.component))];
  const items: CreatePlanItemInput[] = [];
  const used = new Set<string>();
  let skillCursor = 0,
    left = remainingTests,
    reviewCursor = 0;
  for (let day = 0; day <= dayNumber(endsOn) - dayNumber(startsOn); day++) {
    const scheduledOn = addDays(startsOn, day),
      daily: CreatePlanItemInput[] = [];
    const todayTests = new Set<string>();
    const pace =
      remainingTests === 0
        ? 1
        : Math.min(3, Math.max(0, Math.ceil(requiredPace)), left);
    for (let slot = 0; slot < pace; slot++) {
      if (tests.every((t) => used.has(t.testId))) used.clear();
      let test: Extract<PlanCandidate, { activityType: "TEST" }> | undefined;
      for (let offset = 0; offset < skills.length; offset++) {
        const skill = skills[(skillCursor + offset) % skills.length];
        test = tests.find(
          (t) =>
            t.component === skill &&
            !used.has(t.testId) &&
            !todayTests.has(t.testId),
        );
        if (test) {
          skillCursor = (skillCursor + offset + 1) % skills.length;
          break;
        }
      }
      // Never repeat a test within a day, even if the catalog is too small for the pace.
      if (!test) break;
      used.add(test.testId);
      todayTests.add(test.testId);
      daily.push({
        activityType: "TEST",
        scheduledOn,
        sortOrder: daily.length,
        targetCount: 1,
        component: test.component,
        partNumber: test.partNumber,
        testId: test.testId,
        reason: remainingTests === 0 ? "BAND_PRACTICE" : "GOAL_PACE",
      });
      if (remainingTests > 0) left--;
    }
    if (daily.length < 3) {
      const review = mistakes[reviewCursor];
      if (review) {
        reviewCursor++;
        daily.push({
          activityType: "MISTAKE_REVIEW",
          scheduledOn,
          sortOrder: daily.length,
          targetCount: 1,
          sourceAttemptId: review.sourceAttemptId,
          questionKeys: review.questionKeys,
          component: review.component,
          reason: "RECENT_MISTAKES",
        });
      } else if (topics.length) {
        const topic = topics[day % topics.length];
        daily.push({
          activityType: "TOPIC_REVIEW",
          scheduledOn,
          sortOrder: daily.length,
          targetCount: 1,
          topicId: topic.topicId,
          testId: topic.testId,
          component: topic.component,
          partNumber: topic.partNumber,
          reason: "WEAK_TOPIC",
        });
      }
    }
    if (vocab && daily.length < 3)
      daily.push({
        activityType: "VOCAB_REVIEW",
        scheduledOn,
        sortOrder: daily.length,
        targetCount: vocab.targetCount,
        reason: "DAILY_VOCAB",
      });
    items.push(...daily);
  }
  return items;
}
