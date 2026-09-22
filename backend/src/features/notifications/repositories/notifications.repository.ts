import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { QueryAdminNotificationDto } from '../dto/query-admin-notification.dto';
import { QueryUserNotificationDto } from '../dto/query-user-notification.dto';

export type NotificationRow = {
  id: string;
  created_by: string | null;
  title: string;
  content: string;
  type: string;
  channel: string;
  audience_type: string;
  audience_role_id: string | null;
  action_path: string | null;
  status: string;
  sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type UserNotificationInboxRow = {
  recipient_id: string;
  notification_id: string;
  title: string;
  content: string;
  type: string;
  channel: string;
  action_path: string | null;
  delivered_at: Date | null;
  read_at: Date | null;
  created_at: Date;
};

@Injectable()
export class NotificationsRepository {
  constructor(private readonly dataSource: DataSource) {}

  // --- ADMIN METHODS ---

  async createNotification(creatorId: string, dto: CreateNotificationDto): Promise<NotificationRow> {
    const rows = await this.dataSource.query<NotificationRow[]>(
      `INSERT INTO notifications (
        created_by, title, content, type, channel, audience_type, audience_role_id, action_path, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DRAFT')
      RETURNING id, created_by, title, content, type, channel, audience_type, audience_role_id,
                action_path, status, sent_at, created_at, updated_at`,
      [
        creatorId,
        dto.title,
        dto.content,
        dto.type,
        dto.channel,
        dto.audienceType,
        dto.audienceRoleId ?? null,
        dto.actionPath ?? null,
      ],
    );
    return rows[0];
  }

  async findAdminNotifications(query: QueryAdminNotificationDto): Promise<{ data: NotificationRow[]; total: number }> {
    const values: unknown[] = [];
    const where: string[] = [];

    if (query.status) {
      values.push(query.status);
      where.push(`status = $${values.length}`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (query.page - 1) * query.pageSize;
    const limitParam = `$${values.length + 1}`;
    const offsetParam = `$${values.length + 2}`;

    const [rows, countRows] = await Promise.all([
      this.dataSource.query<NotificationRow[]>(
        `SELECT id, created_by, title, content, type, channel, audience_type, audience_role_id,
                action_path, status, sent_at, created_at, updated_at
         FROM notifications
         ${whereSql}
         ORDER BY created_at DESC
         LIMIT ${limitParam} OFFSET ${offsetParam}`,
        [...values, query.pageSize, offset],
      ),
      this.dataSource.query<Array<{ total: string }>>(
        `SELECT count(*)::text AS total FROM notifications ${whereSql}`,
        values,
      ),
    ]);

    return {
      data: rows,
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async findNotificationById(id: string): Promise<NotificationRow | null> {
    const rows = await this.dataSource.query<NotificationRow[]>(
      `SELECT id, created_by, title, content, type, channel, audience_type, audience_role_id,
              action_path, status, sent_at, created_at, updated_at
       FROM notifications
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async dispatchNotification(notificationId: string, targetUserIds?: string[]): Promise<number> {
    return this.dataSource.transaction(async manager => {
      const notifs = await manager.query<NotificationRow[]>(
        `SELECT * FROM notifications WHERE id = $1 FOR UPDATE`,
        [notificationId],
      );
      const notif = notifs[0];
      if (!notif) return 0;

      let insertRecipientsSql = '';
      const params: unknown[] = [notificationId];

      if (notif.audience_type === 'ALL') {
        insertRecipientsSql = `
          INSERT INTO notification_recipients (notification_id, user_id, delivery_status, delivered_at)
          SELECT $1, id, 'DELIVERED', now()
          FROM users WHERE status = 'ACTIVE' AND deleted_at IS NULL
          ON CONFLICT (notification_id, user_id) DO NOTHING`;
      } else if (notif.audience_type === 'ROLE' && notif.audience_role_id) {
        params.push(notif.audience_role_id);
        insertRecipientsSql = `
          INSERT INTO notification_recipients (notification_id, user_id, delivery_status, delivered_at)
          SELECT $1, id, 'DELIVERED', now()
          FROM users WHERE role_id = $2 AND status = 'ACTIVE' AND deleted_at IS NULL
          ON CONFLICT (notification_id, user_id) DO NOTHING`;
      } else if (targetUserIds && targetUserIds.length > 0) {
        params.push(targetUserIds);
        insertRecipientsSql = `
          INSERT INTO notification_recipients (notification_id, user_id, delivery_status, delivered_at)
          SELECT $1, id, 'DELIVERED', now()
          FROM users WHERE id = ANY($2::uuid[]) AND deleted_at IS NULL
          ON CONFLICT (notification_id, user_id) DO NOTHING`;
      }

      let insertedCount = 0;
      if (insertRecipientsSql) {
        const result = await manager.query(insertRecipientsSql, params);
        insertedCount = result[1] ?? 0;
      }

      await manager.query(
        `UPDATE notifications SET status = 'SENT', sent_at = now(), updated_at = now() WHERE id = $1`,
        [notificationId],
      );

      return insertedCount;
    });
  }

  async deleteNotification(id: string): Promise<boolean> {
    await this.dataSource.query(`DELETE FROM notifications WHERE id = $1`, [id]);
    return true;
  }

  // --- USER INBOX METHODS ---

  async findUserInbox(userId: string, query: QueryUserNotificationDto): Promise<{ data: UserNotificationInboxRow[]; total: number }> {
    const values: unknown[] = [userId];
    const where: string[] = ['r.user_id = $1', 'r.dismissed_at IS NULL'];

    if (query.unreadOnly) {
      where.push('r.read_at IS NULL');
    }

    const whereSql = where.join(' AND ');
    const offset = (query.page - 1) * query.pageSize;
    const limitParam = `$${values.length + 1}`;
    const offsetParam = `$${values.length + 2}`;

    const [rows, countRows] = await Promise.all([
      this.dataSource.query<UserNotificationInboxRow[]>(
        `SELECT r.id AS recipient_id, n.id AS notification_id, n.title, n.content,
                n.type, n.channel, n.action_path, r.delivered_at, r.read_at, r.created_at
         FROM notification_recipients r
         JOIN notifications n ON n.id = r.notification_id
         WHERE ${whereSql}
         ORDER BY r.created_at DESC
         LIMIT ${limitParam} OFFSET ${offsetParam}`,
        [...values, query.pageSize, offset],
      ),
      this.dataSource.query<Array<{ total: string }>>(
        `SELECT count(*)::text AS total
         FROM notification_recipients r
         WHERE ${whereSql}`,
        values,
      ),
    ]);

    return {
      data: rows,
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async countUnread(userId: string): Promise<number> {
    const rows = await this.dataSource.query<Array<{ count: string }>>(
      `SELECT count(*)::text AS count
       FROM notification_recipients
       WHERE user_id = $1 AND read_at IS NULL AND dismissed_at IS NULL`,
      [userId],
    );
    return Number(rows[0]?.count ?? 0);
  }

  async markAsRead(userId: string, recipientOrNotifId: string): Promise<boolean> {
    await this.dataSource.query(
      `UPDATE notification_recipients
       SET read_at = COALESCE(read_at, now()), updated_at = now()
       WHERE user_id = $1 AND (id = $2 OR notification_id = $2)`,
      [userId, recipientOrNotifId],
    );
    return true;
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    await this.dataSource.query(
      `UPDATE notification_recipients
       SET read_at = COALESCE(read_at, now()), updated_at = now()
       WHERE user_id = $1 AND read_at IS NULL AND dismissed_at IS NULL`,
      [userId],
    );
    return true;
  }

  async dismissNotification(userId: string, recipientOrNotifId: string): Promise<boolean> {
    await this.dataSource.query(
      `UPDATE notification_recipients
       SET dismissed_at = now(), updated_at = now()
       WHERE user_id = $1 AND (id = $2 OR notification_id = $2)`,
      [userId, recipientOrNotifId],
    );
    return true;
  }
}
