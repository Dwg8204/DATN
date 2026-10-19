import { AssessmentResult, AttemptRow } from '../types/attempt.type';

export const SPEAKING_PART_NOTICE =
  'Bài luyện một Part không đủ để ước lượng CEFR toàn kỹ năng Speaking. Điểm /50 chỉ dùng luyện tập nội bộ.';

export function isSpeakingPart(
  attempt: Pick<AttemptRow, 'component' | 'scope'>,
): boolean {
  return attempt.component === 'SPEAKING' && attempt.scope === 'PART';
}

/** Also protects reads of legacy results before their data migration runs. */
export function presentSpeakingResult(
  result: AssessmentResult | null,
  attempt: Pick<AttemptRow, 'component' | 'scope'>,
): AssessmentResult | null {
  if (!isSpeakingPart(attempt) || !result?.speaking) return result;
  return {
    ...result,
    gradingNotice: SPEAKING_PART_NOTICE,
    speaking: {
      ...result.speaking,
      estimatedCefr: null,
      cefrReason: SPEAKING_PART_NOTICE,
    },
  };
}
