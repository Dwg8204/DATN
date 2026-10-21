import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { validateTopicLabels } from "./topic-contract";
import { TopicInputDto, TopicReviewDto } from "./topics.dto";
import { buildRulePlan } from "../personalization/policies/rule-plan";
const q = {
  id: "q",
  part_number: 1,
  question_hash: "hash",
  content: {},
  correct_answer: {},
  sample_answer: null,
};
const topics = [{ id: "t", code: "present-simple", name: "Present simple" }];
const reply = (values: unknown[]) => ({
  labels: [{ questionId: "q", topics: values }],
});
describe("topic labeling boundaries", () => {
  it("drops unknown codes while retaining allowed labels", () => {
    expect(
      validateTopicLabels(
        reply([
          { topicCode: "invented", confidence: 1 },
          { topicCode: "present-simple", confidence: 0.4 },
        ]),
        [q],
        topics,
      ),
    ).toEqual([{ question: q, topic: topics[0], confidence: 0.4 }]);
  });
  it.each([-1, 1.01, NaN, "0.5", null])(
    "rejects invalid confidence %s",
    (confidence) => {
      expect(() =>
        validateTopicLabels(
          reply([{ topicCode: "present-simple", confidence }]),
          [q],
          topics,
        ),
      ).toThrow();
    },
  );
  it("rejects missing questions, duplicate questions and unknown-only assignments", () => {
    for (const raw of [
      { labels: [] },
      reply([{ topicCode: "invented", confidence: 1 }]),
      { labels: [{ questionId: "other", topics: [] }] },
    ])
      expect(() => validateTopicLabels(raw, [q], topics)).toThrow();
    const one = reply([{ topicCode: "present-simple", confidence: 1 }]);
    expect(() =>
      validateTopicLabels(
        { labels: [...one.labels, ...one.labels] },
        [q],
        topics,
      ),
    ).toThrow();
  });
  it("rejects malformed and excessive labels", () => {
    for (const raw of [
      null,
      {},
      reply([]),
      reply(Array(4).fill({ topicCode: "present-simple", confidence: 1 })),
    ])
      expect(() => validateTopicLabels(raw, [q], topics)).toThrow();
  });
  it("validates admin input and blocks client-supplied ownership or source", () => {
    const dto = {
      code: "present-simple",
      name: "Present simple",
      component: "GRAMMAR_VOCAB",
      topicType: "KNOWLEDGE",
      isActive: true,
    };
    expect(validateSync(plainToInstance(TopicInputDto, dto))).toHaveLength(0);
    expect(
      validateSync(
        plainToInstance(TopicInputDto, { ...dto, createdBy: "me" }),
        { whitelist: true, forbidNonWhitelisted: true },
      ),
    ).not.toHaveLength(0);
    expect(
      validateSync(plainToInstance(TopicReviewDto, { items: [] })),
    ).not.toHaveLength(0);
  });
  it("creates bounded topic review tasks only from supplied candidates", () => {
    const plan = buildRulePlan(
      [
        {
          candidateId: "topic",
          activityType: "TOPIC_REVIEW",
          topicId: "t",
          topicName: "Topic",
          testId: "test",
          component: "GRAMMAR_VOCAB",
          purpose: "PRACTICE",
          title: "Test",
        },
      ],
      "2026-10-21",
      "2026-10-23",
      1,
      0,
    );
    expect(plan).toHaveLength(3);
    expect(
      plan.every(
        (item) =>
          item.activityType === "TOPIC_REVIEW" && item.targetCount === 1,
      ),
    ).toBe(true);
    expect(buildRulePlan([], "2026-10-21", "2026-10-23", 1, 0)).toEqual([]);
  });
});
