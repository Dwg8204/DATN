import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsRepository, NotificationRow } from '../repositories/notifications.repository';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { QueryAdminNotificationDto } from '../dto/query-admin-notification.dto';
import { QueryUserNotificationDto } from '../dto/query-user-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly notifRepo: NotificationsRepository) {}

  // --- ADMIN SERVICES ---

  async createAndDispatch(creatorId: string, dto: CreateNotificationDto): Promise<NotificationRow> {
    const notif = await this.notifRepo.createNotification(creatorId, dto);
    await this.notifRepo.dispatchNotification(notif.id, dto.targetUserIds);
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

    const count = await this.notifRepo.dispatchNotification(id, targetUserIds);
    return { success: true, deliveredCount: count };
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
}
