import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ApplicationError } from '../../common/errors/application.error';
import { CreateCommentDto } from './comments.dto';

const projection = `c.id, c.skill, c.parent_id AS "parentId", c.reply_to_id AS "replyToId",
  c.author_id AS "authorId", concat_ws(' ',u.first_name,u.last_name) AS author, u.avatar->>'url' AS avatar,
  r.code AS role, c.content, c.created_at AS "createdAt", c.deleted_at AS "deletedAt",
  CASE WHEN c.author_id <> target.author_id THEN concat_ws(' ',mentioned.first_name,mentioned.last_name) ELSE NULL END AS mention`;
const joins = `JOIN users u ON u.id=c.author_id JOIN roles r ON r.id=u.role_id
  LEFT JOIN skill_comments target ON target.id=c.reply_to_id
  LEFT JOIN users mentioned ON mentioned.id=target.author_id`;

@Injectable()
export class CommentsService {
  constructor(private readonly db: DataSource) {}

  async list(skill: string, page: number) {
    // A single snapshot keeps the count, root page and their replies consistent.
    const [result] = await this.db.query(`WITH roots AS (
      SELECT id FROM skill_comments WHERE skill=$1 AND parent_id IS NULL
      ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET $2
    ), visible AS (
      SELECT ${projection} FROM skill_comments c ${joins}
      WHERE c.skill=$1 AND (c.id IN (SELECT id FROM roots) OR c.parent_id IN (SELECT id FROM roots))
    ) SELECT (SELECT count(*)::int FROM skill_comments WHERE skill=$1 AND deleted_at IS NULL) AS total,
      (SELECT count(*)::int FROM skill_comments WHERE skill=$1 AND parent_id IS NULL) AS "rootTotal",
      COALESCE((SELECT jsonb_agg(v ORDER BY v."createdAt",v.id) FROM visible v),'[]'::jsonb) AS comments`,
    [skill, (page - 1) * 20]);
    const roots = result.comments.filter((c: any) => !c.parentId).reverse();
    const replies = new Map<string, any[]>();
    for (const comment of result.comments) {
      if (comment.parentId) {
        const thread = replies.get(comment.parentId) ?? [];
        thread.push(comment); replies.set(comment.parentId, thread);
      }
    }
    return { comments: roots.map((c: any) => ({ ...c, replies: replies.get(c.id) ?? [] })),
      total: result.total, page, hasMore: page * 20 < result.rootTotal };
  }

  async create(authorId: string, dto: CreateCommentDto) {
    return this.db.transaction(async manager => {
      let parentId: string | null = null;
      if (dto.replyToId) {
        const [target] = await manager.query(`SELECT id,parent_id FROM skill_comments
          WHERE id=$1 AND skill=$2 AND deleted_at IS NULL FOR SHARE`, [dto.replyToId, dto.skill]);
        if (!target) throw new ApplicationError('COMMENT_NOT_FOUND', 'The comment is no longer available.', 404);
        parentId = target.parent_id ?? target.id;
      }
      const [created] = await manager.query(`INSERT INTO skill_comments(skill,author_id,content,parent_id,reply_to_id)
        VALUES($1,$2,$3,$4,$5) RETURNING id`, [dto.skill, authorId, dto.content, parentId, dto.replyToId ?? null]);
      const [comment] = await manager.query(`SELECT ${projection} FROM skill_comments c ${joins} WHERE c.id=$1`, [created.id]);
      return { ...comment, replies: [] };
    });
  }

  async remove(authorId: string, id: string, skill: string) {
    const rows = await this.db.query(`WITH removed AS (UPDATE skill_comments SET content='',deleted_at=now()
      WHERE id=$1 AND skill=$2 AND author_id=$3 AND deleted_at IS NULL RETURNING id) SELECT id FROM removed`, [id, skill, authorId]);
    if (!rows.length) throw new ApplicationError('COMMENT_NOT_FOUND', 'The comment is no longer available.', 404);
    return { id };
  }
}
