import { AssessmentPaper } from '../types/attempt.type';
import { AiAssessment, CRITERIA_KEYS } from './speaking-ai-policy';

export function speakingCompletionContext(paper: AssessmentPaper, assessed: AiAssessment) {
  const byKey = new Map(assessed.responses.map(response => [response.key, response]));
  const total = paper.items.length;
  const criteria = Object.fromEntries(CRITERIA_KEYS.map(name => [name, total
    ? paper.items.reduce((sum, item) => sum + (byKey.get(item.key)?.status === 'ASSESSED' ? byKey.get(item.key)!.criteria[name] : 0), 0) / total : 0]));
  return { assessmentScope: paper.mode === 'full' ? 'FULL_SKILL' : 'PART', mode: paper.mode,
    totalQuestions: total, recordedQuestions: byKey.size,
    assessableQuestions: assessed.responses.filter(response => response.status === 'ASSESSED').length,
    skippedKeys: paper.items.filter(item => !byKey.has(item.key)).map(item => item.key),
    unassessableKeys: assessed.responses.filter(response => response.status !== 'ASSESSED').map(response => response.key),
    partCoverage: [...new Set(paper.items.map(item => item.partNumber))].map(partNumber => ({ partNumber,
      total: paper.items.filter(item => item.partNumber === partNumber).length,
      assessed: paper.items.filter(item => item.partNumber === partNumber && byKey.get(item.key)?.status === 'ASSESSED').length })),
    criteriaIncludingSkippedZeros: criteria,
    practiceScoreOutOf50: Math.round(Object.values(criteria).reduce((sum, value) => sum + value, 0) / 4 * 50) / 100,
  };
}

export function speakingCefrNeedsRepair(paper: AssessmentPaper, assessed: AiAssessment): boolean {
  if (paper.mode !== 'full' || !assessed.responses.some(response => response.status === 'ASSESSED')) return false;
  if (assessed.estimatedCefr === null || !assessed.cefrReason.trim()) return true;
  const reason = assessed.cefrReason.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return /(?:mot (?:phan thi|part)|single part).{0,65}(?:khong the|cannot|can't)/u.test(reason);
}

export const SPEAKING_COMPLETION_RULES = `
FULL-TEST COMPLETION POLICY:
The server's mode/assessmentScope is authoritative. mode=full stays a FULL test even when answers are skipped; never describe it as a single-Part attempt.
Return responses for exactly responseKeys (recorded audio) only. Do NOT put skippedKeys in responses; discuss skipped tasks in partFeedback and cefrReason.
For full tests with at least one ASSESSED spoken response, provide a conservative provisional CEFR from the actual assessable speech; do not withhold CEFR solely because one or more questions or Parts are skipped.
Use null only when no speech can genuinely be assessed (all NO_SPEECH/INSUFFICIENT_EVIDENCE). Do not invent assessable speech to meet this rule.
The internal /50 is averaged over ALL scheduled questions, with skipped/unassessable answers zero. Do not penalize the pronunciation/fluency of an answered question merely for omissions elsewhere; the server already includes those zeros.
CEFR and /50 are related views of this practice performance, not a fixed conversion table. Consider all four audio-based criteria, completion and missing higher-level tasks when selecting the overall band.
For otherwise similar speech, omissions reduce overall performance and the evidence supporting higher CEFR bands. Select a conservative supported band, explain which missing tasks limit it, and do not present incomplete high-level evidence as a complete high-level performance.
Omitting one question does not automatically remove the whole assessment or require a one-band downgrade: select the band justified by the remaining speech and completion. Never infer CEFR by hard /50 thresholds.
For Part-only practice keep estimatedCefr=null, without claiming whole-test CEFR. All estimates are practice estimates, not certified Aptis results.`;
