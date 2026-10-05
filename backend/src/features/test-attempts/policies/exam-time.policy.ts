import { SkillComponent } from '../types/attempt.type';

// Exam timing is fixed per skill. Practice does not use an exam deadline.
const LIMIT_MINUTES: Partial<Record<SkillComponent, number>> = {
  GRAMMAR_VOCAB: 25,
  LISTENING: 40,
  WRITING: 50,
  SPEAKING: 12,
};

export function examDurationMinutes(component: SkillComponent): number | null {
  return LIMIT_MINUTES[component] ?? null;
}
