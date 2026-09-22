import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/types/auth-user.type';
import { NotificationsService } from '../services/notifications.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { QueryAdminNotificationDto } from '../dto/query-admin-notification.dto';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminNotificationsController {
  constructor(private readonly notifService: NotificationsService) {}

  @Get()
  async listAdminNotifications(@Query() query: QueryAdminNotificationDto) {
    return this.notifService.listAdminNotifications(query);
  }

  @Post()
  async createNotification(@CurrentUser() user: AuthUser, @Body() dto: CreateNotificationDto) {
    const data = await this.notifService.createAndDispatch(user.id, dto);
    return { data };
  }

  @Post(':id/send')
  async sendNow(@Param('id') id: string, @Body('targetUserIds') targetUserIds?: string[]) {
    return this.notifService.sendNotificationNow(id, targetUserIds);
  }

  @Delete(':id')
  async deleteNotification(@Param('id') id: string) {
    return this.notifService.deleteNotification(id);
  }
}
