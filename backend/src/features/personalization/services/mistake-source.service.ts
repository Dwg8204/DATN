import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AuthUser } from '../../auth/types/auth-user.type';
import { TestAttemptsService } from '../../test-attempts/services/test-attempts.service';
import { PracticeAttemptsService } from '../../test-attempts/services/practice-attempts.service';
import { SkillComponent } from '../../test-attempts/types/attempt.type';
import { MistakeReference } from '../types/snapshot.type';
import { addDays, localDay } from '../policies/calendar';

@Injectable()
export class MistakeSourceService {
  private readonly logger = new Logger(MistakeSourceService.name);
  constructor(
    private readonly db: DataSource,
    private readonly exams: TestAttemptsService,
    private readonly practice: PracticeAttemptsService,
  ) {}

  details(actor: AuthUser, attemptId: string, purpose: string, part: number) {
    return (purpose === 'PRACTICE' ? this.practice : this.exams).details(
      attemptId,
      part,
      actor,
    );
  }

  async recent(
    actor: AuthUser,
    asOf: Date,
    timezone: string,
    manager: EntityManager = this.db.manager,
  ): Promise<MistakeReference[]> {
    const rows = await manager.query<
      Array<{
        id: string;
        purpose: string;
        component: SkillComponent;
        part_number: number | null;
        parts: Array<{ partNumber: number }> | null;
      }>
    >(
      `SELECT id,purpose,component,part_number,result->'parts' AS parts FROM test_attempts
       WHERE student_id=$1 AND status='SUBMITTED' AND component IN ('GRAMMAR_VOCAB','READING','LISTENING')
         AND result->>'method'='OBJECTIVE' AND submitted_at >= ($2::date::timestamp AT TIME ZONE $3) AND submitted_at <= $4
       ORDER BY submitted_at DESC,id DESC LIMIT 200`,
      [actor.id, addDays(localDay(asOf, timezone), -13), timezone, asOf],
    );
    const references: MistakeReference[] = [];
    for (const row of rows) {
      const parts = row.part_number
        ? [row.part_number]
        : Array.isArray(row.parts)
          ? row.parts.map((part) => part.partNumber)
          : [1, 2, 3, 4];
      for (const part of [...new Set(parts)].sort()) {
        try {
          const detail = await this.details(actor, row.id, row.purpose, part);
          for (const item of detail.items) {
            if (
              item.outcome?.outcome === 'INCORRECT' ||
              item.outcome?.outcome === 'SKIPPED'
            )
              references.push({
                attemptId: row.id,
                questionKey: item.key,
                component: row.component,
                partNumber: part,
              });
            if (references.length === 30) return references;
          }
        } catch {
          // Historical snapshots can be unsupported; do not expose their contents in logs.
          this.logger.warn(
            'A historical attempt could not be read for mistake review.',
          );
        }
      }
    }
    return references;
  }
}
