import { buildRulePlan, PlanCandidate } from './rule-plan';
import { buildAbilityProfile } from '../../ai-shared/ability-profile';
import { missingPlacement, suggestedTarget } from '../../ai-shared/placement';
import { assertPlacement } from '../../../common/tests/test-placement';
it('requires three objective skills for a new learner and rejects Part placement', () => {
  const profile = buildAbilityProfile([], new Date());
  expect(missingPlacement(profile)).toEqual([
    'GRAMMAR_VOCAB',
    'READING',
    'LISTENING',
  ]);
  expect(suggestedTarget(profile)).toBeNull();
  expect(() => assertPlacement(true, 'part1')).toThrow();
  expect(assertPlacement(true, 'full')).toBe(true);
});
it.each([0, 1, 3])(
  'places three assessments once on days 1–3 at pace %s',
  (pace) => {
    const placements = ['GRAMMAR_VOCAB', 'READING', 'LISTENING'].map(
      (component, i) => ({
        candidateId: 'p' + i,
        activityType: 'TEST',
        testId: 'p' + i,
        component,
        purpose: 'PLACEMENT',
        title: '',
      }),
    ) as PlanCandidate[];
    const regular = {
      candidateId: 'r',
      activityType: 'TEST',
      testId: 'r',
      component: 'READING',
      purpose: 'PRACTICE',
      title: '',
    } as PlanCandidate;
    const items = buildRulePlan(
      [...placements, regular],
      '2026-10-01',
      '2026-10-07',
      pace,
      pace * 7,
    );
    expect(
      items
        .filter((i) => i.reason === 'PLACEMENT')
        .map((i) => ['testId' in i ? i.testId : null, i.scheduledOn]),
    ).toEqual([
      ['p0', '2026-10-01'],
      ['p1', '2026-10-02'],
      ['p2', '2026-10-03'],
    ]);
    for (const date of new Set(items.map((i) => i.scheduledOn)))
      expect(
        items.filter((i) => i.scheduledOn === date).length,
      ).toBeLessThanOrEqual(3);
  },
);
import { buildSampleTests } from '../../../database/seeds/seed-sample-tests';
import { GrammarTestContentService } from '../../grammar-tests/services/grammar-test-content.service';
import { ReadingTestContentService } from '../../reading-tests/services/reading-test-content.service';
import { ListeningTestContentService } from '../../listening-tests/services/listening-test-content.service';
import { WritingTestContentService } from '../../writing-tests/services/writing-test-content.service';
import { SpeakingTestContentService } from '../../speaking-tests/services/speaking-test-content.service';
it('all five save pipelines preserve the flag and reject Part assessments', () => {
  const definitions = buildSampleTests();
  const services = [
    GrammarTestContentService,
    ReadingTestContentService,
    ListeningTestContentService,
    WritingTestContentService,
    SpeakingTestContentService,
  ];
  ['GRAMMAR_VOCAB', 'READING', 'LISTENING', 'WRITING', 'SPEAKING'].forEach(
    (component, i) => {
      const service: any = new services[i]();
      const full = definitions.find(
        (d) => d.component === component && d.test.mode === 'full',
      )!.test;
      const part = definitions.find(
        (d) => d.component === component && d.test.mode === 'part1',
      )!.test;
      expect(
        service.normalize({ ...full, isPlacement: true }).isPlacement,
      ).toBe(true);
      expect(
        service.normalize({ ...full, isPlacement: false }).isPlacement,
      ).toBe(false);
      expect(service.normalize(full).isPlacement).toBeUndefined();
      expect(() => service.normalize({ ...part, isPlacement: true })).toThrow();
    },
  );
});
