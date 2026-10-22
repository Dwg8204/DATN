import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { LearningInsightsRepository } from '../repositories/learning-insights.repository';
import { ReportJob } from '../ai/report.contract';

/** Read-only projection shared with chatbot. Never exposes internal candidate mappings. */
@Injectable()
export class InsightContextService {
  constructor(private readonly insights: LearningInsightsRepository) {}

  async read(userId: string, insightId: string) {
    const row = await this.insights.findById(userId, insightId);
    const job = row?.snapshot as unknown as ReportJob | undefined;
    if (!row || !['WEEKLY', 'MIDTERM', 'FINAL'].includes(row.kind) || !job?.learner)
      throw new ApplicationError('CHAT_INSIGHT_UNAVAILABLE', 'Learning report unavailable.', 404);
    const learner = job.learner;
    // Keep aggregates and at most five recent scores per group; the report's progress
    // and outcomes remain exact even when its underlying assessment sample is large.
    const groups = (values: typeof learner.statistics) => values.map(group => ({
      component: group.component, purpose: group.purpose, scope: group.scope,
      partNumber: group.partNumber, sampleSize: group.sampleSize,
      scores: group.scores.slice(0, 5), parts: group.parts,
    }));
    return {
      insightId: row.id, kind: row.kind, weekIndex: row.week_index,
      coversFrom: row.covers_from, coversTo: row.covers_to,
      status: row.status, source: row.content?.source ?? 'RULE',
      snapshotVersion: row.snapshot_version, inputHash: row.input_hash,
      snapshot: {
        goal: learner.goal, band: learner.band, baseline: learner.baseline ?? null, bandChange: learner.bandChange ?? [], statistics: groups(learner.statistics),
        cumulative: { completed: learner.cumulative.completed, statistics: groups(learner.cumulative.statistics) },
        weak: learner.weak, mistakes: learner.mistakes, vocab: learner.vocab,
        habit: learner.habit, period: learner.period,
      },
      outcome: job.outcome ?? null, content: row.content?.report ?? null,
      limitation: 'Saved report snapshot, not current progress. At most five score samples per group. CEFR is an estimate; do not recalculate scores or infer bands from Parts.',
    };
  }
}
