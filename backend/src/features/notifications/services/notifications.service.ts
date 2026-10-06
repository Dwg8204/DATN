import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationsRepository, NotificationRow } from '../repositories/notifications.repository';
import {
  CreateNotificationDto,
  NotificationAttachmentDto,
  NotificationAudienceType,
  NotificationChannel,
} from '../dto/create-notification.dto';
import { QueryAdminNotificationDto } from '../dto/query-admin-notification.dto';
import { QueryUserNotificationDto } from '../dto/query-user-notification.dto';
import { ApplicationError } from '../../../common/errors/application.error';
import { MailService } from '../../auth/services/mail.service';
import { NotificationsGateway } from '../gateways/notifications.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notifRepo: NotificationsRepository,
    private readonly mailService: MailService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  // --- ADMIN SERVICES ---

  async createAndDispatch(creatorId: string, dto: CreateNotificationDto): Promise<NotificationRow> {
    if (dto.attachment) {
      const url = new URL(dto.attachment.url);
      const cloudinaryAttachment = url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' &&
        dto.attachment.publicId.includes('/notification-attachments/');
      const localAttachment = ['http:', 'https:'].includes(url.protocol) &&
        /^local:notification-attachments\/[0-9a-f-]{36}(?:\.[a-z0-9]{1,9})?$/.test(dto.attachment.publicId) &&
        /\/api\/v1\/admin\/media\/notification-attachments\/files\/[0-9a-f-]{36}(?:\.[a-z0-9]{1,9})?$/.test(url.pathname);
      if (!cloudinaryAttachment && !localAttachment) {
        throw new ApplicationError('INVALID_NOTIFICATION_ATTACHMENT', 'Upload the attachment before sending the notification.', 400);
      }
    }
    const targetUserIds = [...new Set(dto.targetUserIds ?? [])];
    if (dto.audienceType === NotificationAudienceType.SELECTED_USERS && targetUserIds.length === 0) {
      throw new ApplicationError('NOTIFICATION_RECIPIENTS_REQUIRED', 'Select at least one notification recipient.', 400);
    }
    if (targetUserIds.length > 0) {
      const activeUserIds = await this.notifRepo.findActiveUserIds(targetUserIds);
      if (activeUserIds.length !== targetUserIds.length) {
        throw new ApplicationError('NOTIFICATION_RECIPIENTS_INVALID', 'One or more selected recipients are no longer active.', 400);
      }
    }

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    if (scheduledAt && scheduledAt.getTime() <= Date.now()) {
      throw new ApplicationError('INVALID_NOTIFICATION_SCHEDULE', 'Scheduled notifications must be set for a future time.', 400);
    }

    let recipientEmails: string[] = [];
    if (dto.channel === NotificationChannel.EMAIL) {
      this.mailService.assertConfigured();
      recipientEmails = await this.notifRepo.findActiveUserEmails(targetUserIds);
      if (recipientEmails.length === 0 || recipientEmails.length !== targetUserIds.length) {
        throw new ApplicationError('EMAIL_RECIPIENTS_NOT_FOUND', 'No active registered email addresses match the selected recipients.', 400);
      }
      if (!scheduledAt) {
        await this.mailService.sendNotificationEmail(recipientEmails, dto.title, dto.content, dto.attachment);
      }
    }

    const normalizedDto = { ...dto, targetUserIds };
    const notif = await this.notifRepo.createNotification(creatorId, normalizedDto);
    if (scheduledAt) {
      return (await this.notifRepo.findNotificationById(notif.id)) ?? notif;
    }

    await this.notifRepo.dispatchNotification(notif.id, targetUserIds);
    if (dto.channel === NotificationChannel.IN_APP) {
      const deliveries = await this.notifRepo.findNotificationDeliveries(notif.id);
      this.notificationsGateway.emitCreated(deliveries);
    }
    const updated = await this.notifRepo.findNotificationById(notif.id);
    return updated ?? notif;
  }

  async listAdminNotifications(query: QueryAdminNotificationDto) {
    const { data, total } = await this.notifRepo.findAdminNotifications(query);
    return {
      data,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async sendNotificationNow(id: string, targetUserIds?: string[]): Promise<{ success: boolean; deliveredCount: number }> {
    const notif = await this.notifRepo.findNotificationById(id);
    if (!notif) throw new NotFoundException('Notification not found');

    if (notif.status === 'SCHEDULED') {
      const claimed = await this.notifRepo.claimScheduledNotificationNow(id);
      if (!claimed) return { success: false, deliveredCount: 0 };
      const deliveredCount = await this.deliverScheduledNotification(claimed);
      return { success: deliveredCount > 0, deliveredCount };
    }

    if (notif.channel === NotificationChannel.EMAIL) {
      const recipientEmails = await this.notifRepo.findActiveUserEmails(targetUserIds ?? []);
      if (recipientEmails.length === 0) {
        throw new ApplicationError('EMAIL_RECIPIENTS_NOT_FOUND', 'No active registered email addresses match the selected recipients.', 400);
      }
      await this.mailService.sendNotificationEmail(
        recipientEmails,
        notif.title,
        notif.content,
        (notif.attachment as NotificationAttachmentDto | null) ?? undefined,
      );
    }

    const count = await this.notifRepo.dispatchNotification(id, targetUserIds);
    if (count > 0 && notif.channel === NotificationChannel.IN_APP) {
      const deliveries = await this.notifRepo.findNotificationDeliveries(id);
      this.notificationsGateway.emitCreated(deliveries);
    }
    return { success: true, deliveredCount: count };
  }

  async processDueScheduledBatch(limit = 25): Promise<number> {
    const notifications = await this.notifRepo.claimDueNotifications(limit);
    for (const notification of notifications) {
      try {
        await this.deliverScheduledNotification(notification);
      } catch (error) {
        this.logger.error(
          `Scheduled notification ${notification.id} could not be delivered.`,
          error instanceof Error ? error.stack : undefined,
        );
        await this.notifRepo.failScheduledNotification(notification.id, 'SCHEDULED_DELIVERY_FAILED');
      }
    }
    return notifications.length;
  }

  async deleteNotification(id: string): Promise<{ success: boolean }> {
    const notif = await this.notifRepo.findNotificationById(id);
    if (!notif) throw new NotFoundException('Notification not found');

    await this.notifRepo.deleteNotification(id);
    return { success: true };
  }

  // --- USER INBOX SERVICES ---

  async getUserInbox(userId: string, query: QueryUserNotificationDto) {
    const { data, total } = await this.notifRepo.findUserInbox(userId, query);
    return {
      data,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const count = await this.notifRepo.countUnread(userId);
    return { unreadCount: count };
  }

  async markAsRead(userId: string, id: string): Promise<{ success: boolean }> {
    await this.notifRepo.markAsRead(userId, id);
    return { success: true };
  }

  async markAllAsRead(userId: string): Promise<{ success: boolean }> {
    await this.notifRepo.markAllAsRead(userId);
    return { success: true };
  }

  async dismissNotification(userId: string, id: string): Promise<{ success: boolean }> {
    await this.notifRepo.dismissNotification(userId, id);
    return { success: true };
  }

  private async deliverScheduledNotification(notification: NotificationRow): Promise<number> {
    const recipients = await this.notifRepo.findScheduledRecipients(notification.id);
    for (const recipient of recipients) {
      if (!recipient.is_active) {
        await this.notifRepo.markRecipientFailed(recipient.recipient_id, 'RECIPIENT_INACTIVE');
        continue;
      }

      if (notification.channel === NotificationChannel.EMAIL) {
        if (!recipient.email) {
          await this.notifRepo.markRecipientFailed(recipient.recipient_id, 'RECIPIENT_EMAIL_MISSING');
          continue;
        }
        try {
          await this.mailService.sendNotificationEmail(
            [recipient.email],
            notification.title,
            notification.content,
            (notification.attachment as NotificationAttachmentDto | null) ?? undefined,
          );
          await this.notifRepo.markRecipientDelivered(recipient.recipient_id);
        } catch {
          await this.notifRepo.markRecipientFailed(recipient.recipient_id, 'EMAIL_DELIVERY_FAILED');
        }
      } else if (notification.channel === NotificationChannel.IN_APP) {
        await this.notifRepo.markRecipientDelivered(recipient.recipient_id);
      } else {
        await this.notifRepo.markRecipientFailed(recipient.recipient_id, 'UNSUPPORTED_CHANNEL');
      }
    }

    const deliveredCount = await this.notifRepo.completeScheduledNotification(notification.id);
    if (notification.channel === NotificationChannel.IN_APP && deliveredCount > 0) {
      const deliveries = await this.notifRepo.findNotificationDeliveries(notification.id);
      this.notificationsGateway.emitCreated(deliveries);
    }
    return deliveredCount;
  }
}
