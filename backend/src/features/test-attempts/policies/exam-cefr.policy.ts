import { SkillComponent } from '../types/attempt.type';

export function estimateCefr(component: SkillComponent, score: number, maxScore: number): string | null {
  if (score == null || maxScore == null || maxScore === 0) return null;

  if (component === 'LISTENING') {
    if (score >= 42) return 'C';
    if (score >= 34) return 'B2';
    if (score >= 24) return 'B1';
    if (score >= 16) return 'A2';
    return 'A1';
  }

  // Other components (GRAMMAR_VOCAB, READING, WRITING, SPEAKING) use
  // skill-specific CEFR logic that will be implemented separately.
  return null;
}

