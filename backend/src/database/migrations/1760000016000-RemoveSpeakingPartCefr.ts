import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSpeakingPartCefr1760000016000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const notice =
      'Bài luyện một Part không đủ để ước lượng CEFR toàn kỹ năng Speaking. Điểm /50 chỉ dùng luyện tập nội bộ.';
    await queryRunner.query(
      `
      WITH corrected AS (
        SELECT id,
          CASE WHEN jsonb_typeof(result->'speaking') = 'object' THEN
            jsonb_set(jsonb_set(jsonb_set(result,
              '{speaking,estimatedCefr}', 'null'::jsonb),
              '{speaking,cefrReason}', to_jsonb($1::text)),
              '{gradingNotice}', to_jsonb($1::text))
          ELSE result END AS result
        FROM test_attempts WHERE component = 'SPEAKING' AND scope = 'PART'
      )
      UPDATE test_attempts a SET estimated_cefr = NULL, result = c.result,
        assessment_revision = a.assessment_revision + 1, updated_at = now()
      FROM corrected c WHERE a.id = c.id
        AND (a.estimated_cefr IS NOT NULL OR a.result IS DISTINCT FROM c.result)
    `,
      [notice],
    );
    await queryRunner.query(`
      ALTER TABLE test_attempts ADD CONSTRAINT speaking_part_cefr_ck CHECK (
        component <> 'SPEAKING' OR scope <> 'PART' OR
        (estimated_cefr IS NULL AND result #>> '{speaking,estimatedCefr}' IS NULL)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE test_attempts DROP CONSTRAINT speaking_part_cefr_ck',
    );
    // Invalid estimates cannot be recovered by a schema rollback.
  }
}
