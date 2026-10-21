import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { randomUUID } from 'crypto';
import { ApplicationError } from '../../common/errors/application.error';

const messageFields = `id,session_id AS "sessionId",sequence_no::int AS sequence,lower(role::text) AS role,
  content,status,reply_to_id AS "replyToId",client_message_id AS "clientMessageId",feedback,citations,actions,
  error_code AS "errorCode",created_at AS "createdAt"`;
export const chatError = (code: string, status = 409) => new ApplicationError(code, code, status);

@Injectable()
export class ChatbotRepository {
  constructor(readonly db: DataSource) {}
  async owned(userId: string, id: string, manager = this.db.manager, lock = false) {
    const [s] = await manager.query(`SELECT * FROM chat_sessions WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL${lock ? ' FOR UPDATE' : ''}`, [id,userId]);
    if (!s) throw chatError('CHAT_NOT_FOUND',404);
    return s;
  }
  async expire(manager: EntityManager, id: string) {
    await manager.query(`UPDATE chat_messages SET status='FAILED',error_code='CHAT_INTERRUPTED',completed_at=clock_timestamp()
      WHERE session_id=$1 AND role='ASSISTANT' AND status='PENDING' AND created_at<clock_timestamp()-interval '90 seconds'`,[id]);
  }
  async sessions(userId: string, page: number) {
    const rows = await this.db.query(`SELECT id,title,context_attempt_id AS "attemptId",context_question_key AS "questionKey",context_insight_id AS "insightId",updated_at AS "updatedAt"
      FROM chat_sessions WHERE user_id=$1 AND deleted_at IS NULL ORDER BY updated_at DESC,id DESC LIMIT 21 OFFSET $2`,[userId,(page-1)*20]);
    return { items:rows.slice(0,20),hasMore:rows.length>20,page };
  }
  async create(userId: string, id: string, attemptId?: string, questionKey?: string, insightId?: string) {
    await this.db.query(`INSERT INTO chat_sessions(id,user_id,title,context_attempt_id,context_question_key,context_insight_id)
      VALUES($1,$2,'New conversation',$3,$4,$5) ON CONFLICT(id) DO NOTHING`,[id,userId,attemptId??null,questionKey??null,insightId??null]);
    const session = await this.owned(userId,id);
    if (session.context_attempt_id !== (attemptId??null) || session.context_question_key !== (questionKey??null) || session.context_insight_id !== (insightId??null)) throw chatError('CHAT_REQUEST_CONFLICT');
    return {id:session.id,title:session.title,attemptId:session.context_attempt_id,questionKey:session.context_question_key,insightId:session.context_insight_id,updatedAt:session.updated_at};
  }
  async messages(userId: string,id: string,page: number) {
    await this.owned(userId,id);
    await this.expire(this.db.manager,id);
    const rows = await this.db.query(`SELECT ${messageFields} FROM chat_messages WHERE session_id=$1 ORDER BY sequence_no DESC LIMIT 31 OFFSET $2`,[id,(page-1)*30]);
    return {items:rows.slice(0,30).reverse(),hasMore:rows.length>30,page};
  }
  async rename(userId: string,id: string,title: string) {
    await this.owned(userId,id);
    await this.db.query('UPDATE chat_sessions SET title=$3,updated_at=now() WHERE id=$1 AND user_id=$2',[id,userId,title]);
    return {id,title};
  }
  async remove(userId: string,id: string) {
    await this.db.transaction(async m => {
      await this.owned(userId,id,m,true);
      await m.query(`UPDATE chat_messages SET status='FAILED',error_code='CHAT_DELETED',completed_at=now() WHERE session_id=$1 AND status='PENDING'`,[id]);
      await m.query('UPDATE chat_sessions SET deleted_at=now() WHERE id=$1',[id]);
    });
    return {id};
  }
  async feedback(userId: string,id: string,messageId: string,feedback: number) {
    await this.owned(userId,id);
    const rows = await this.db.query(`WITH changed AS (UPDATE chat_messages SET feedback=$3 WHERE id=$1 AND session_id=$2
      AND role='ASSISTANT' AND status='COMPLETED' RETURNING id,feedback) SELECT * FROM changed`,[messageId,id,feedback||null]);
    if (!rows.length) throw chatError('CHAT_NOT_FOUND',404);
    return rows[0];
  }
  async begin(userId: string,id: string,clientId: string,content: string) {
    return this.db.transaction(async m => {
      // Serialise each user's quota and each session's message sequence across processes.
      await m.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`chat:${userId}`]);
      const session = await this.owned(userId,id,m,true);
      await this.expire(m,id);
      const [existing] = await m.query(`SELECT id,content FROM chat_messages WHERE session_id=$1 AND client_message_id=$2`,[id,clientId]);
      if(existing) {
        if(existing.content!==content) throw chatError('CHAT_REQUEST_CONFLICT');
        const [reply] = await m.query(`SELECT ${messageFields} FROM chat_messages WHERE reply_to_id=$1 ORDER BY sequence_no DESC LIMIT 1`,[existing.id]);
        return {session,reply,fresh:false};
      }
      return this.insertTurn(m,userId,session,content,clientId);
    });
  }
  async retry(userId: string,id: string,messageId: string) {
    return this.db.transaction(async m => {
      await m.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`chat:${userId}`]);
      const session = await this.owned(userId,id,m,true);
      await this.expire(m,id);
      const [last] = await m.query(`SELECT * FROM chat_messages WHERE session_id=$1 ORDER BY sequence_no DESC LIMIT 1`,[id]);
      if(last?.reply_to_id && last.status==='PENDING') {
        const [target]=await m.query('SELECT reply_to_id FROM chat_messages WHERE id=$1 AND session_id=$2',[messageId,id]);
        if(target?.reply_to_id!==last.reply_to_id)throw chatError('CHAT_RETRY_NOT_AVAILABLE');
        return {session,reply:await this.message(last.id),fresh:false};
      }
      if(last?.id!==messageId || last.role!=='ASSISTANT' || last.status!=='FAILED') throw chatError('CHAT_RETRY_NOT_AVAILABLE');
      const [question] = await m.query('SELECT content FROM chat_messages WHERE id=$1',[last.reply_to_id]);
      return this.insertTurn(m,userId,session,question.content,undefined,last.reply_to_id);
    });
  }
  private async insertTurn(m: EntityManager,userId: string,session: any,content: string,clientId?: string,replyTo?: string) {
    const [pending] = await m.query(`SELECT id FROM chat_messages WHERE session_id=$1 AND role='ASSISTANT' AND status='PENDING'`,[session.id]);
    if(pending) throw chatError('CHAT_BUSY');
    const [quota] = await m.query(`SELECT count(*) FILTER(WHERE m.created_at>now()-interval '1 minute')::int AS minute,
      count(*)::int AS day FROM chat_messages m JOIN chat_sessions s ON s.id=m.session_id
      WHERE s.user_id=$1 AND m.role='ASSISTANT' AND m.created_at>now()-interval '1 day'`,[userId]);
    if(quota.minute>=5 || quota.day>=50) throw chatError('CHAT_RATE_LIMIT',429);
    const [seq] = await m.query('SELECT COALESCE(max(sequence_no),0)::int AS n FROM chat_messages WHERE session_id=$1',[session.id]);
    let n = seq.n;
    if(!replyTo) {
      replyTo=randomUUID();
      await m.query(`INSERT INTO chat_messages(id,session_id,sequence_no,role,content,status,client_message_id) VALUES($1,$2,$3,'USER',$4,'COMPLETED',$5)`,[replyTo,session.id,++n,content,clientId]);
    }
    const [reply] = await m.query(`INSERT INTO chat_messages(session_id,sequence_no,role,content,reply_to_id) VALUES($1,$2,'ASSISTANT','',$3) RETURNING ${messageFields}`,[session.id,++n,replyTo]);
    await m.query(`UPDATE chat_sessions SET updated_at=now(),title=CASE WHEN $2 THEN $3 ELSE title END WHERE id=$1`,[session.id,seq.n===0,content.replace(/\s+/g,' ').slice(0,80)]);
    return {session,reply,fresh:true};
  }
  async history(id: string,sequence: number) {
    return this.db.query(`SELECT lower(role::text) AS role,content FROM (
      SELECT role,content,sequence_no FROM chat_messages WHERE session_id=$1 AND sequence_no<$2 AND status='COMPLETED'
      ORDER BY sequence_no DESC LIMIT 21) recent ORDER BY sequence_no`,[id,sequence]);
  }
  async finish(id: string,content: string,citations: unknown[],actions: unknown[],context: unknown) {
    await this.db.query(`UPDATE chat_messages SET content=$2,citations=$3,actions=$4,context=$5,status='COMPLETED',completed_at=clock_timestamp()
      WHERE id=$1 AND status='PENDING' AND created_at>clock_timestamp()-interval '90 seconds'
      AND EXISTS(SELECT 1 FROM chat_sessions s WHERE s.id=chat_messages.session_id AND s.deleted_at IS NULL)`,[id,content,JSON.stringify(citations),JSON.stringify(actions),JSON.stringify(context)]);
  }
  async fail(id: string,code: string) {
    await this.db.query(`UPDATE chat_messages SET status='FAILED',error_code=$2,completed_at=now() WHERE id=$1 AND status='PENDING'`,[id,code]);
  }
  async message(id: string) { const [m] = await this.db.query(`SELECT ${messageFields} FROM chat_messages WHERE id=$1`,[id]); return m; }
}
