import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../src/database/data-source-options';
import {
  buildQuestionText,
  QUESTION_TEXT_VERSION,
} from '../src/features/retrieval/question-text';
import { EMBEDDING_MODEL } from '../src/features/retrieval/embedding.service';
import { KnowledgeSearchService } from '../src/features/retrieval/knowledge-search.service';
import { QuestionSearchService } from '../src/features/retrieval/question-search.service';

// Read-only readiness and retrieval check; uses stored vectors, no provider calls or learner records.
async function main() {
  const db = await new DataSource({
    ...createDataSourceOptions(),
    logging: false,
  }).initialize();
  try {
    const rows =
      await db.query(`SELECT q.*,e.question_hash stored_hash,e.content_text stored_text,e.question_key stored_key,
      e.embedding_model stored_model,e.embedding_version stored_version FROM topic_question_catalog q
      JOIN tests t ON t.id=q.test_id JOIN topic_snapshot_questions sq ON sq.snapshot_id=t.published_snapshot_id
      AND sq.question_id=q.id AND sq.question_hash=q.question_hash LEFT JOIN question_embeddings e ON e.question_id=q.id
      WHERE t.status='PUBLISHED' AND t.archived_at IS NULL`);
    const missing = rows.filter((q: any) => !q.stored_hash).length;
    const stale = rows.filter(
      (q: any) =>
        q.stored_hash &&
        (q.stored_hash !== q.question_hash ||
          q.stored_key !== q.question_key ||
          q.stored_text !== buildQuestionText(q) ||
          q.stored_model !== EMBEDDING_MODEL ||
          q.stored_version !== QUESTION_TEXT_VERSION),
    ).length;
    const [knowledge] =
      await db.query(`SELECT count(DISTINCT d.id)::int documents,count(c.id)::int chunks,
      count(c.embedding)::int vectors FROM knowledge_documents d LEFT JOIN knowledge_chunks c ON c.document_id=d.id WHERE d.status='READY'`);
    const [jobs] =
      await db.query(`SELECT count(*) FILTER(WHERE completed_at IS NOT NULL)::int completed,
      count(*) FILTER(WHERE completed_at IS NULL AND retry_count<5)::int pending,
      count(*) FILTER(WHERE completed_at IS NULL AND retry_count>=5)::int failed FROM question_embedding_jobs`);
    const [chunk] =
      await db.query(`SELECT c.embedding::text vector,c.content FROM knowledge_chunks c
      JOIN knowledge_documents d ON d.id=c.document_id WHERE d.status='READY' AND d.access_scope='LEARNER' AND c.embedding IS NOT NULL LIMIT 1`);
    const knowledgeHits = chunk
      ? await new KnowledgeSearchService(db, {} as any).searchVector(
          JSON.parse(chunk.vector),
          chunk.content.slice(0, 300),
          { limit: 5 },
        )
      : [];
    const [question] =
      await db.query(`SELECT e.embedding::text vector,e.component,e.question_id FROM question_embeddings e
      JOIN tests t ON t.id=e.test_id WHERE t.status='PUBLISHED' AND t.archived_at IS NULL LIMIT 1`);
    const questionHits = question
      ? await new QuestionSearchService(db).similar(
          [JSON.parse(question.vector)],
          {
            component: question.component,
            regularOnly: false,
            minSimilarity: 0.99,
          },
        )
      : [];
    console.log(
      JSON.stringify(
        {
          questions: { expected: rows.length, missing, stale },
          knowledge,
          jobs,
          smoke: {
            knowledgeHits: knowledgeHits.length,
            questionHits: questionHits.length,
          },
        },
        null,
        2,
      ),
    );
    if (
      missing ||
      stale ||
      jobs.pending ||
      jobs.failed ||
      !knowledgeHits.length ||
      !questionHits.length
    )
      process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}
main().catch(() => {
  console.error('RAG readiness check failed. Check database and migrations.');
  process.exitCode = 1;
});
