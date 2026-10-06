import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
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
  attachment: Record<string, unknown> | null;
  action_path: string | null;
  scheduled_at: Date | null;
  status: string;
  sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
  recipient_count?: number;
  recipient_emails?: string[];
};

export type UserNotificationInboxRow = {
  recipient_id: string;
  notification_id: string;
  title: string;
  content: string;
  type: string;
  channel: string;
  action_path: string | null;
  attachment: Record<string, unknown> | null;
  delivered_at: Date | null;
  read_at: Date | null;
  created_at: Date;
};

export type NotificationDeliveryRow = UserNotificationInboxRow & { user_id: string };

export type ScheduledNotificationRecipientRow = {
  recipient_id: string;
  user_id: string;
  email: string | null;
  is_active: boolean;
};

@Injectable()
export class NotificationsRepository {
  constructor(private readonly dataSource: DataSource) {}

  // --- ADMIN METHODS ---

  async findActiveUserEmails(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const rows = await this.dataSource.query<Array<{ email: string }>>(
      `SELECT email FROM users
       WHERE id = ANY($1::uuid[]) AND status = 'ACTIVE' AND deleted_at IS NULL
         AND email IS NOT NULL AND btrim(email) <> ''`,
      [userIds],
    );
    return rows.map(row => row.email);
  }

  async findActiveUserIds(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const rows = await this.dataSource.query<Array<{ id: string }>>(
      `SELECT id FROM users
       WHERE id = ANY($1::uuid[]) AND status = 'ACTIVE' AND deleted_at IS NULL`,
      [userIds],
    );
    return rows.map(row => row.id);
  }

  async createNotification(creatorId: string, dto: CreateNotificationDto): Promise<NotificationRow> {
    return this.dataSource.transaction(async manager => {
      const isScheduled = Boolean(dto.scheduledAt);
      const rows = await manager.query<NotificationRow[]>(
        `INSERT INTO notifications (
          created_by, title, content, type, channel, audience_type, audience_role_id, attachment,
          action_path, scheduled_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)
        RETURNING id, created_by, title, content, type, channel, audience_type, audience_role_id,
                  attachment, action_path, scheduled_at, status, sent_at, created_at, updated_at`,
        [
          creatorId,
          dto.title,
          dto.content,
          dto.type,
          dto.channel,
          dto.audienceType,
          dto.audienceRoleId ?? null,
          dto.attachment ? JSON.stringify(dto.attachment) : null,
          dto.actionPath ?? null,
          dto.scheduledAt ?? null,
          isScheduled ? 'SCHEDULED' : 'DRAFT',
        ],
      );
      const notification = rows[0];
      if (isScheduled) {
        await this.insertRecipients(manager, notification, dto.targetUserIds, 'PENDING');
      }
      return notification;
    });
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
                attachment, action_path, scheduled_at, status, sent_at, created_at, updated_at,
                (SELECT count(*)::int FROM notification_recipients r WHERE r.notification_id = notifications.id) AS recipient_count,
                COALESCE((SELECT array_agg(u.email::text ORDER BY u.email)
                          FROM notification_recipients r JOIN users u ON u.id = r.user_id
                          WHERE r.notification_id = notifications.id), ARRAY[]::text[]) AS recipient_emails
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
              attachment, action_path, scheduled_at, status, sent_at, created_at, updated_at,
              (SELECT count(*)::int FROM notification_recipients r WHERE r.notification_id = notifications.id) AS recipient_count,
              COALESCE((SELECT array_agg(u.email::text ORDER BY u.email)
                        FROM notification_recipients r JOIN users u ON u.id = r.user_id
                        WHERE r.notification_id = notifications.id), ARRAY[]::text[]) AS recipient_emails
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

      const insertedCount = await this.insertRecipients(manager, notif, targetUserIds, 'DELIVERED');

      await manager.query(
        `UPDATE notifications SET status = 'SENT', sent_at = now(), updated_at = now() WHERE id = $1`,
        [notificationId],
      );

      return insertedCount;
    });
  }

  async claimDueNotifications(limit: number): Promise<NotificationRow[]> {
    return this.dataSource.query<NotificationRow[]>(
      `WITH due AS (
         SELECT id
         FROM notifications
         WHERE (status = 'SCHEDULED' AND scheduled_at <= now())
            OR (status = 'SENDING' AND updated_at < now() - interval '10 minutes')
         ORDER BY scheduled_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT $1
       )
       UPDATE notifications n
       SET status = 'SENDING', updated_at = now()
       FROM due
       WHERE n.id = due.id
       RETURNING n.id, n.created_by, n.title, n.content, n.type, n.channel, n.audience_type,
                 n.audience_role_id, n.attachment, n.action_path, n.scheduled_at, n.status,
                 n.sent_at, n.created_at, n.updated_at`,
      [limit],
    );
  }

  async claimScheduledNotificationNow(id: string): Promise<NotificationRow | null> {
    const rows = await this.dataSource.query<NotificationRow[]>(
      `UPDATE notifications
       SET status = 'SENDING', scheduled_at = COALESCE(scheduled_at, now()), updated_at = now()
       WHERE id = $1 AND status = 'SCHEDULED'
       RETURNING id, created_by, title, content, type, channel, audience_type, audience_role_id,
                 attachment, action_path, scheduled_at, status, sent_at, created_at, updated_at`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findScheduledRecipients(notificationId: string): Promise<ScheduledNotificationRecipientRow[]> {
    return this.dataSource.query<ScheduledNotificationRecipientRow[]>(
      `SELECT r.id AS recipient_id, r.user_id, u.email,
              (u.id IS NOT NULL AND u.status = 'ACTIVE' AND u.deleted_at IS NULL) AS is_active
       FROM notification_recipients r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.notification_id = $1 AND r.delivery_status = 'PENDING'
       ORDER BY r.created_at ASC`,
      [notificationId],
    );
  }

  async markRecipientDelivered(recipientId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE notification_recipients
       SET delivery_status = 'DELIVERED', delivered_at = now(), error_code = NULL, updated_at = now()
       WHERE id = $1 AND delivery_status = 'PENDING'`,
      [recipientId],
    );
  }

  async markRecipientFailed(recipientId: string, errorCode: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE notification_recipients
       SET delivery_status = 'FAILED', error_code = $2, updated_at = now()
       WHERE id = $1 AND delivery_status = 'PENDING'`,
      [recipientId, errorCode.slice(0, 100)],
    );
  }

  async completeScheduledNotification(notificationId: string): Promise<number> {
    const rows = await this.dataSource.query<Array<{ delivered_count: number }>>(
      `WITH counts AS (
         SELECT count(*) FILTER (WHERE delivery_status = 'DELIVERED')::int AS delivered_count
         FROM notification_recipients
         WHERE notification_id = $1
       ), updated AS (
         UPDATE notifications
         SET status = CASE WHEN counts.delivered_count > 0 THEN 'SENT'::notification_status ELSE 'FAILED'::notification_status END,
             sent_at = CASE WHEN counts.delivered_count > 0 THEN now() ELSE sent_at END,
             updated_at = now()
         FROM counts
         WHERE id = $1
         RETURNING counts.delivered_count
       )
       SELECT delivered_count FROM updated`,
      [notificationId],
    );
    return rows[0]?.delivered_count ?? 0;
  }

  async failScheduledNotification(notificationId: string, errorCode: string): Promise<void> {
    await this.dataSource.transaction(async manager => {
      await manager.query(
        `UPDATE notification_recipients
         SET delivery_status = 'FAILED', error_code = $2, updated_at = now()
         WHERE notification_id = $1 AND delivery_status = 'PENDING'`,
        [notificationId, errorCode.slice(0, 100)],
      );
      await manager.query(
        `UPDATE notifications SET status = 'FAILED', updated_at = now() WHERE id = $1`,
        [notificationId],
      );
    });
  }

  async findNotificationDeliveries(notificationId: string): Promise<NotificationDeliveryRow[]> {
    return this.dataSource.query<NotificationDeliveryRow[]>(
      `SELECT r.id AS recipient_id, r.user_id, n.id AS notification_id, n.title, n.content,
              n.type, n.channel, n.action_path, n.attachment, r.delivered_at, r.read_at, r.created_at
       FROM notification_recipients r
       JOIN notifications n ON n.id = r.notification_id
       WHERE r.notification_id = $1 AND r.delivery_status = 'DELIVERED' AND r.dismissed_at IS NULL`,
      [notificationId],
    );
  }

  async deleteNotification(id: string): Promise<boolean> {
    await this.dataSource.query(`DELETE FROM notifications WHERE id = $1`, [id]);
    return true;
  }

  // --- USER INBOX METHODS ---

  async findUserInbox(userId: string, query: QueryUserNotificationDto): Promise<{ data: UserNotificationInboxRow[]; total: number }> {
    const values: unknown[] = [userId];
    const where: string[] = ["r.user_id = $1", "r.delivery_status = 'DELIVERED'", 'r.dismissed_at IS NULL'];

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
                n.type, n.channel, n.action_path, n.attachment, r.delivered_at, r.read_at, r.created_at
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
       WHERE user_id = $1 AND delivery_status = 'DELIVERED' AND read_at IS NULL AND dismissed_at IS NULL`,
      [userId],
    );
    return Number(rows[0]?.count ?? 0);
  }

  async markAsRead(userId: string, recipientOrNotifId: string): Promise<boolean> {
    await this.dataSource.query(
      `UPDATE notification_recipients
       SET read_at = COALESCE(read_at, now()), updated_at = now()
       WHERE user_id = $1 AND delivery_status = 'DELIVERED' AND (id = $2 OR notification_id = $2)`,
      [userId, recipientOrNotifId],
    );
    return true;
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    await this.dataSource.query(
      `UPDATE notification_recipients
       SET read_at = COALESCE(read_at, now()), updated_at = now()
       WHERE user_id = $1 AND delivery_status = 'DELIVERED' AND read_at IS NULL AND dismissed_at IS NULL`,
      [userId],
    );
    return true;
  }

  async dismissNotification(userId: string, recipientOrNotifId: string): Promise<boolean> {
    await this.dataSource.query(
      `UPDATE notification_recipients
       SET dismissed_at = now(), updated_at = now()
       WHERE user_id = $1 AND delivery_status = 'DELIVERED' AND (id = $2 OR notification_id = $2)`,
      [userId, recipientOrNotifId],
    );
    return true;
  }

  private async insertRecipients(
    manager: EntityManager,
    notification: NotificationRow,
    targetUserIds: string[] | undefined,
    deliveryStatus: 'PENDING' | 'DELIVERED',
  ): Promise<number> {
    let usersSql = '';
    const params: unknown[] = [notification.id];
    if (notification.audience_type === 'ALL') {
      usersSql = `SELECT id FROM users WHERE status = 'ACTIVE' AND deleted_at IS NULL`;
    } else if (notification.audience_type === 'ROLE' && notification.audience_role_id) {
      params.push(notification.audience_role_id);
      usersSql = `SELECT id FROM users WHERE role_id = $2 AND status = 'ACTIVE' AND deleted_at IS NULL`;
    } else if (targetUserIds && targetUserIds.length > 0) {
      params.push(targetUserIds);
      usersSql = `SELECT id FROM users WHERE id = ANY($2::uuid[]) AND status = 'ACTIVE' AND deleted_at IS NULL`;
    } else {
      return 0;
    }

    const deliveredAt = deliveryStatus === 'DELIVERED' ? 'now()' : 'NULL';
    const rows = await manager.query<Array<{ count: number }>>(
      `WITH inserted AS (
         INSERT INTO notification_recipients (notification_id, user_id, delivery_status, delivered_at)
         SELECT $1, selected.id, '${deliveryStatus}', ${deliveredAt}
         FROM (${usersSql}) selected
         ON CONFLICT (notification_id, user_id) DO NOTHING
         RETURNING 1
       )
       SELECT count(*)::int AS count FROM inserted`,
      params,
    );
    return rows[0]?.count ?? 0;
  }
}
