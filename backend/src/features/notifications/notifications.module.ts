import { Module } from '@nestjs/common';
import { AdminNotificationsController } from './controllers/admin-notifications.controller';
import { UserNotificationsController } from './controllers/user-notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { NotificationsRepository } from './repositories/notifications.repository';

@Module({
  controllers: [AdminNotificationsController, UserNotificationsController],
  providers: [NotificationsService, NotificationsRepository],
  exports: [NotificationsService],
})
export class NotificationsModule {}
