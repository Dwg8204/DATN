import { Controller, Get, Patch, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/types/auth-user.type';
import { NotificationsService } from '../services/notifications.service';
import { QueryUserNotificationDto } from '../dto/query-user-notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class UserNotificationsController {
  constructor(private readonly notifService: NotificationsService) {}

  @Get()
  async getInbox(@CurrentUser() user: AuthUser, @Query() query: QueryUserNotificationDto) {
    return this.notifService.getUserInbox(user.id, query);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: AuthUser) {
    return this.notifService.getUnreadCount(user.id);
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: AuthUser) {
    return this.notifService.markAllAsRead(user.id);
  }

  @Patch(':id/read')
  async markAsRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifService.markAsRead(user.id, id);
  }

  @Delete(':id')
  async dismissNotification(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifService.dismissNotification(user.id, id);
  }
}
