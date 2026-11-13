import { Injectable } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { ApplicationError } from "../../common/errors/application.error";
export const PUBLIC_CHUNK_WHERE = `d.status='READY' AND d.access_scope='LEARNER'
 AND d.metadata->>'examVariant' IN ('APTIS_ESOL_GENERAL','ENGLISH')
 AND NOT EXISTS(SELECT 1 FROM knowledge_documents newer WHERE newer.document_key=d.document_key AND newer.version_no>d.version_no AND newer.status='READY')`;
@Injectable()
export class LearnerKnowledgeService {
  constructor(private readonly db: DataSource) {}
  async sources(ids: string[], manager: EntityManager = this.db.manager) {
    if (!ids.length) return [];
    return manager.query<
      Array<{ chunkId: string; title: string; excerpt: string }>
    >(
      `SELECT c.id "chunkId",d.title,left(c.content,400) excerpt
      FROM knowledge_chunks c JOIN knowledge_documents d ON d.id=c.document_id WHERE c.id=ANY($1::uuid[]) AND ${PUBLIC_CHUNK_WHERE} ORDER BY c.id`,
      [ids],
    );
  }
  async read(id: string) {
    const [row] = await this.db.query(
      `SELECT c.id "chunkId",d.title,c.content FROM knowledge_chunks c JOIN knowledge_documents d ON d.id=c.document_id WHERE c.id=$1 AND ${PUBLIC_CHUNK_WHERE}`,
      [id],
    );
    if (!row)
      throw new ApplicationError(
        "LESSON_UNAVAILABLE",
        "Learning source unavailable.",
        404,
      );
    return row;
  }
}
