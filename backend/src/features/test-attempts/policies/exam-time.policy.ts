import { SkillComponent } from '../types/attempt.type';

// Aptis General timing is fixed per skill; part practice uses the same server limit for now.
const LIMIT_MINUTES: Partial<Record<SkillComponent, number>> = {
  GRAMMAR_VOCAB: 25,
  LISTENING: 40,
  WRITING: 50,
};

export function examDurationMinutes(component: SkillComponent): number | null {
  return LIMIT_MINUTES[component] ?? null;
}
