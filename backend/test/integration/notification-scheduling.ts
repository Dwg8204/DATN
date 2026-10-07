import 'reflect-metadata';
import 'dotenv/config';
import assert = require('node:assert/strict');
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { createDataSourceOptions } from '../../src/database/data-source-options';
import { NotificationsRepository, NotificationDeliveryRow } from '../../src/features/notifications/repositories/notifications.repository';
import { NotificationsService } from '../../src/features/notifications/services/notifications.service';
import { NotificationAudienceType, NotificationChannel, NotificationType } from '../../src/features/notifications/dto/create-notification.dto';
import { MailService } from '../../src/features/auth/services/mail.service';
import { NotificationsGateway } from '../../src/features/notifications/gateways/notifications.gateway';
import { QueryAdminNotificationDto, NotificationStatus } from '../../src/features/notifications/dto/query-admin-notification.dto';

// Real PostgreSQL and TypeORM return shapes, but all reads/writes are isolated
// in connection-local TEMP tables. No real schedules, recipients or SMTP calls.
async function main() {
  const connection = new DataSource(createDataSourceOptions());
  await connection.initialize();
  const runner = connection.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    for (const table of ['users', 'notifications', 'notification_recipients']) {
      await runner.query(`CREATE TEMP TABLE ${table} (LIKE public.${table}
        INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES) ON COMMIT DROP`);
    }
    const db = { query: runner.query.bind(runner), transaction: (fn: (manager: EntityManager) => Promise<unknown>) =>
      runner.manager.transaction(fn) } as unknown as DataSource;
    const repo = new NotificationsRepository(db);
    const mails: Array<{ recipients: string[]; subject: string; content: string; attachment: unknown }> = [];
    const sockets: NotificationDeliveryRow[][] = [];
    let rejectEmail = false;
    const mail = {
      assertConfigured() {},
      async sendNotificationEmail(recipients: string[], subject: string, content: string, attachment?: unknown) {
        if (rejectEmail) throw new Error('Synthetic SMTP failure');
        mails.push({ recipients, subject, content, attachment });
      },
    } as unknown as MailService;
    const gateway = { emitCreated(rows: NotificationDeliveryRow[]) { sockets.push(rows); } } as unknown as NotificationsGateway;
    const service = new NotificationsService(repo, mail, gateway);
    const userA = randomUUID(), userB = randomUUID();
    for (const id of [userA, userB]) await runner.query(`INSERT INTO users
      (id,email,password_hash,first_name,last_name,role_id,status)
      SELECT $1,$2,'test-only','Scheduler','Test',id,'ACTIVE' FROM public.roles WHERE code='STUDENT'`,
    [id, `${id}@example.invalid`]);
    const scheduledAt = new Date(Date.now() + 3_600_000).toISOString();
    const dto = { title: 'Scheduled test', content: 'Scheduled content', type: NotificationType.SYSTEM,
      channel: NotificationChannel.IN_APP, audienceType: NotificationAudienceType.SELECTED_USERS,
      targetUserIds: [userA], scheduledAt };
    const makeDue = (id: string) => runner.query(`UPDATE notifications SET scheduled_at=now()-interval '1 minute' WHERE id=$1`, [id]);
    const state = async (id: string) => (await runner.query('SELECT status FROM notifications WHERE id=$1', [id]))[0].status;

    const push = await service.createAndDispatch(userA, dto);
    assert.equal(push.status, 'SCHEDULED');
    assert.equal(push.recipient_count, 1);
    assert.equal(await repo.countUnread(userA), 0, 'pending notification stays out of the inbox');
    assert.deepEqual(await repo.claimDueNotifications(25), [], 'future schedules must not be claimed');
    await makeDue(push.id);
    const claimed = await repo.claimDueNotifications(25);
    assert.equal(claimed.length, 1, 'claim must return rows, not the TypeORM UPDATE tuple');
    assert.equal(claimed[0].id, push.id);
    assert.equal(claimed[0].status, 'SENDING');
    assert.deepEqual(await repo.claimDueNotifications(25), [], 'a fresh claim must not be reclaimed');
    await runner.query(`UPDATE notifications SET updated_at=now()-interval '11 minutes' WHERE id=$1`, [push.id]);
    assert.equal(await service.processDueScheduledBatch(), 1, 'stale SENDING schedule is recovered');
    assert.equal(await state(push.id), 'SENT');
    assert.equal(await repo.countUnread(userA), 1);
    assert.equal(await repo.countUnread(userB), 0, 'only the selected recipient receives the notification');
    assert.equal(sockets.length, 1);
    assert.equal(sockets[0][0].user_id, userA);
    assert.equal(await service.processDueScheduledBatch(), 0, 'completed schedule is not sent twice');

    const attachment = { name: 'Lesson.pdf', mimeType: 'application/pdf', size: 10,
      url: 'https://res.cloudinary.com/test/raw/upload/notification-attachments/lesson.pdf',
      publicId: 'test/notification-attachments/lesson' };
    const email = await service.createAndDispatch(userA, { ...dto, channel: NotificationChannel.EMAIL, attachment });
    assert.equal(mails.length, 0, 'scheduling an email does not send it immediately');
    await makeDue(email.id);
    assert.equal(await service.processDueScheduledBatch(), 1);
    assert.equal(await state(email.id), 'SENT');
    assert.deepEqual(mails[0], { recipients: [`${userA}@example.invalid`], subject: dto.title,
      content: dto.content, attachment });
    assert.equal(sockets.length, 1, 'scheduled email does not emit an in-app socket event');

    const manual = await service.createAndDispatch(userA, dto);
    const claimedNow = await repo.claimScheduledNotificationNow(manual.id);
    assert.equal(claimedNow?.id, manual.id, 'manual claim also returns a row, not a tuple');
    assert.equal(await repo.claimScheduledNotificationNow(manual.id), null);
    const sendNow = await service.createAndDispatch(userA, dto);
    assert.deepEqual(await service.sendNotificationNow(sendNow.id), { success: true, deliveredCount: 1 });
    assert.equal(await state(sendNow.id), 'SENT');

    const failedEmail = await service.createAndDispatch(userA, { ...dto, channel: NotificationChannel.EMAIL });
    rejectEmail = true;
    await makeDue(failedEmail.id);
    assert.equal(await service.processDueScheduledBatch(), 1);
    assert.equal(await state(failedEmail.id), 'FAILED');
    const [failedRecipient] = await runner.query('SELECT delivery_status,error_code FROM notification_recipients WHERE notification_id=$1', [failedEmail.id]);
    assert.equal(failedRecipient.delivery_status, 'FAILED');
    assert.equal(failedRecipient.error_code, 'EMAIL_DELIVERY_FAILED');

    const inactive = await service.createAndDispatch(userA, { ...dto, targetUserIds: [userB] });
    await runner.query("UPDATE users SET status='INACTIVE' WHERE id=$1", [userB]);
    await makeDue(inactive.id);
    assert.equal(await service.processDueScheduledBatch(), 1);
    assert.equal(await state(inactive.id), 'FAILED');
    assert.equal(await repo.countUnread(userB), 0);
    const find = (search: string, page = 1, pageSize = 8, status?: NotificationStatus) =>
      repo.findAdminNotifications({ search, page, pageSize, status } as QueryAdminNotificationDto);
    const [needle] = await runner.query(`INSERT INTO notifications
      (created_by,title,content,type,channel,audience_type,status,attachment,created_at)
      VALUES($1,'Unique old subject','Nội dung kiểm thử 100%_done','SYSTEM','EMAIL','SELECTED_USERS','SENT',
        '{"name":"Unique-report.xlsx"}'::jsonb,now()-interval '2 years') RETURNING id`, [userA]);
    await runner.query(`INSERT INTO notification_recipients(notification_id,user_id,delivery_status,delivered_at)
      VALUES($1,$2,'DELIVERED',now())`, [needle.id, userA]);
    await runner.query(`INSERT INTO notifications(title,content,type,channel,audience_type,status)
      SELECT 'Page fill ' || i,'Page fill content','SYSTEM','IN_APP','ALL','SENT' FROM generate_series(1,105) i`);
    assert.equal((await find('UNIQUE OLD SUBJECT')).data[0].id, needle.id, 'search reaches old rows beyond the first 100');
    assert.equal((await find('nội dung')).total, 1, 'Vietnamese content is searchable');
    assert.equal((await find('UNIQUE-REPORT')).data[0].id, needle.id, 'attachment names are searchable');
    assert.equal((await find('100%_done')).total, 1, 'percent and underscore are literal, not wildcards');
    const byEmail = await find(`${userA}@example.invalid`);
    assert.ok(byEmail.total > 0);
    assert.ok(byEmail.data.every(n => n.recipient_emails?.includes(`${userA}@example.invalid`)));
    const firstPage = await find('Page fill', 1, 8), secondPage = await find('Page fill', 2, 8);
    assert.equal(firstPage.total, 105);
    assert.equal(secondPage.total, 105);
    assert.equal(firstPage.data.length, 8);
    assert.equal(secondPage.data.length, 8);
    assert.ok(firstPage.data.every(n => !secondPage.data.some(other => other.id === n.id)), 'search pages do not overlap');
    assert.equal((await find('Page fill', 1, 8, NotificationStatus.FAILED)).total, 0);
    assert.equal((await find('does-not-exist')).total, 0);
    assert.equal((await find("' OR 1=1 --")).total, 0, 'search uses bound parameters');
    assert.equal((await find('')).total, (await find('   ')).total, 'clearing search restores all records');
    console.log('PASS: isolated PostgreSQL scheduling, stale recovery, recipients, socket/email delivery and server search/pagination beyond 100 rows.');
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
    await connection.destroy();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
