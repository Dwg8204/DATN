import { EntityManager } from 'typeorm';
import { AbilityProfile, CEFR_LABELS, CEFR_LEVELS } from './ability-profile';
import { SkillComponent } from '../test-attempts/types/attempt.type';
export const PLACEMENT_REQUIRED = [
  'GRAMMAR_VOCAB',
  'READING',
  'LISTENING',
] as const;
export const missingPlacement = (profile: AbilityProfile) =>
  PLACEMENT_REQUIRED.filter(
    (skill) =>
      !profile.bySkill.some((s) => s.skill === skill && (s.assessmentComplete ?? s.status !== 'NONE')),
  );
export const REGULAR_TEST_SQL = `NOT t.is_placement AND NOT EXISTS(SELECT 1 FROM tests placement WHERE placement.placement_family_id=t.placement_family_id AND placement.is_placement)`;
export async function placementTests(manager: EntityManager) {
  return manager.query<
    Array<{
      skill: SkillComponent;
      testId: string;
      title: string;
      purpose: string;
    }>
  >(`SELECT DISTINCT ON(t.component) t.component AS skill,t.id AS "testId",t.title,t.purpose FROM tests t JOIN test_snapshots s ON s.id=t.published_snapshot_id
 WHERE t.is_placement AND t.scope='FULL_SKILL' AND t.status='PUBLISHED' AND t.archived_at IS NULL AND s.schema_version=1 ORDER BY t.component,(t.purpose='EXAM') DESC,t.id`);
}
export const suggestedTarget = (profile: AbilityProfile) =>
  profile.overall.band
    ? CEFR_LABELS[Math.min(5, CEFR_LEVELS[profile.overall.band] + 1)]
    : null;
