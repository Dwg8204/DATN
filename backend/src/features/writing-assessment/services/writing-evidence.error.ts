import { AiError } from '../../../common/ai/ai-error';
import { WRITING_CRITERIA } from '../contracts/writing-assessment-output';

export type WritingEvidenceLocation = { path: string; questionKey?: string; criterion?: string };

export class WritingEvidenceError extends AiError {
  readonly location?: WritingEvidenceLocation;
  constructor(rule: string, location?: WritingEvidenceLocation) {
    super('AI_WRITING_EVIDENCE_INVALID', true, undefined, rule);
    // Only generated paths and canonical identifiers may reach logs, never quotations or responses.
    if (location) this.location = {
      path: /^[a-zA-Z0-9_.\[\]]{1,200}$/.test(location.path) ? location.path : 'redacted',
      questionKey: location.questionKey && /^p[1-4]:q[1-9][0-9]*$/.test(location.questionKey) ? location.questionKey : undefined,
      criterion: location.criterion && WRITING_CRITERIA.some(criterion => criterion === location.criterion) ? location.criterion : undefined,
    };
  }
}
