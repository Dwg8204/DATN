import { SkillComponent } from '../../test-attempts/types/attempt.type';
import { CreatePlanItemInput } from '../types/personalization.type';
import { addDays, dayNumber } from './calendar';

export type PlanCandidate =
  | {candidateId:string;activityType:'TOPIC_REVIEW';topicId:string;topicName:string;testId:string;component:SkillComponent;partNumber?:number;purpose:string;title:string}
  | {
      candidateId: string;
      activityType: 'TEST';
      testId: string;
      component: SkillComponent;
      partNumber?: number;
      purpose: string;
      title: string;
    }
  | {
      candidateId: string;
      activityType: 'VOCAB_REVIEW';
      targetCount: 10 | 20 | 30;
    }
  | {
      candidateId: string;
      activityType: 'MISTAKE_REVIEW';
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
    (item): item is Extract<PlanCandidate, { activityType: 'TEST' }> =>
      item.activityType === 'TEST',
  );
  const mistakes = candidates.filter(
    (
      item,
    ): item is Extract<PlanCandidate, { activityType: 'MISTAKE_REVIEW' }> =>
      item.activityType === 'MISTAKE_REVIEW',
  );
  const topics = candidates.filter((item): item is Extract<PlanCandidate,{activityType:'TOPIC_REVIEW'}> => item.activityType==='TOPIC_REVIEW');
  const vocab = candidates.find(
    (item) => item.activityType === 'VOCAB_REVIEW' && item.targetCount === 20,
  );
  const skills = [...new Set(tests.map((item) => item.component))];
  const items: CreatePlanItemInput[] = [];
  let left = remainingTests;
  for (let day = 0; day <= dayNumber(endsOn) - dayNumber(startsOn); day++) {
    const scheduledOn = addDays(startsOn, day);
    const skill = skills[day % skills.length];
    const choices = tests.filter((item) => item.component === skill);
    const test = choices.length
      ? choices[Math.floor(day / skills.length) % choices.length]
      : undefined;
    // Bundle repeated attempts into one task to keep the daily maximum at three.
    const count = remainingTests === 0 ? 1 : Math.min(left, requiredPace);
    if (test && count > 0) {
      items.push({
        activityType: 'TEST',
        scheduledOn,
        sortOrder: 0,
        targetCount: count,
        component: test.component,
        partNumber: test.partNumber,
        testId: test.testId,
        reason: remainingTests === 0 ? 'BAND_PRACTICE' : 'GOAL_PACE',
      });
      left -= count;
    }
    if (vocab)
      items.push({
        activityType: 'VOCAB_REVIEW',
        scheduledOn,
        sortOrder: 1,
        targetCount: 20,
        reason: 'DAILY_VOCAB',
      });
    const review = mistakes[day];
    if (review)
      items.push({
        activityType: 'MISTAKE_REVIEW',
        scheduledOn,
        sortOrder: 2,
        targetCount: 1,
        sourceAttemptId: review.sourceAttemptId,
        questionKeys: review.questionKeys,
        component: review.component,
        reason: 'RECENT_MISTAKES',
      });
    else if (topics.length) {
      const topic=topics[day%topics.length];
      items.push({activityType:'TOPIC_REVIEW',scheduledOn,sortOrder:2,targetCount:1,topicId:topic.topicId,testId:topic.testId,component:topic.component,partNumber:topic.partNumber,reason:'WEAK_TOPIC'});
    }
  }
  return items;
}
