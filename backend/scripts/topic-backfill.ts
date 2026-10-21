import "dotenv/config";
import dataSource from "../src/database/data-source";
import {
  TopicsService,
  CURRENT_TOPIC_LABEL_SQL,
} from "../src/features/topics/topics.service";

async function main() {
  await dataSource.initialize();
  try {
    if (process.argv.includes("--apply")) {
      const result = await new TopicsService(dataSource).suggestMissing(
        null,
        {},
      );
      console.log(
        `Queued ${result.queued} additional tests. Existing labels and pending jobs preserved. No labels approved; the configured worker processes the queue.`,
      );
    } else {
      const [row] = await dataSource.query(
        `SELECT count(*)::int tests FROM tests t WHERE archived_at IS NULL AND EXISTS(SELECT 1 FROM topic_question_catalog q WHERE q.test_id=t.id AND NOT EXISTS(${CURRENT_TOPIC_LABEL_SQL}))`,
      );
      console.log(
        `Dry run: ${row.tests} tests have missing labels (active jobs and cooldowns are skipped when applying). Run migrations first; pass --apply to queue suggestions. No AI calls made by this script.`,
      );
    }
  } finally {
    await dataSource.destroy();
  }
}
main().catch(() => {
  console.error(
    "Topic backfill failed. Check database configuration and migrations.",
  );
  process.exitCode = 1;
});
