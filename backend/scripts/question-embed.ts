import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../src/database/data-source-options';
async function main() {
  const db = await new DataSource({
    ...createDataSourceOptions(),
    logging: false,
  }).initialize();
  try {
    const [counts] =
      await db.query(`SELECT count(DISTINCT q.test_id)::int tests,count(*)::int questions FROM topic_question_catalog q
   JOIN tests t ON t.id=q.test_id JOIN topic_snapshot_questions sq ON sq.snapshot_id=t.published_snapshot_id AND sq.question_id=q.id AND sq.question_hash=q.question_hash
   WHERE t.status='PUBLISHED' AND t.archived_at IS NULL`);
    console.log({ ...counts, apply: process.argv.includes('--apply') });
    if (!process.argv.includes('--apply')) return;
    await db.query(`INSERT INTO question_embedding_jobs(test_id)
   SELECT id FROM tests WHERE status='PUBLISHED' AND archived_at IS NULL AND published_snapshot_id IS NOT NULL
   ON CONFLICT(test_id) DO NOTHING`);
    if (process.argv.includes('--refresh-completed')) {
      await db.query(`UPDATE question_embedding_jobs j SET completed_at=NULL,requested_at=now(),next_retry_at=now(),retry_count=0,error_code=NULL
        FROM tests t WHERE t.id=j.test_id AND j.completed_at IS NOT NULL
        AND t.status='PUBLISHED' AND t.archived_at IS NULL AND t.published_snapshot_id IS NOT NULL`);
    }
    console.log(
      'Queued missing jobs; existing jobs preserved. Worker requires PERSONALIZATION_RAG_ENABLED=true.',
    );
  } finally {
    await db.destroy();
  }
}
main().catch(() => {
  console.error('Question embedding queue failed. Check database/migrations.');
  process.exitCode = 1;
});
