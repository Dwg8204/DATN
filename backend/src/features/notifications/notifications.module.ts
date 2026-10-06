import { Module } from '@nestjs/common';
import { AdminNotificationsController } from './controllers/admin-notifications.controller';
import { UserNotificationsController } from './controllers/user-notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { NotificationsRepository } from './repositories/notifications.repository';
import { AuthModule } from '../auth/auth.module';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { NotificationSchedulerWorker } from './workers/notification-scheduler.worker';

@Module({
  imports: [AuthModule],
  controllers: [AdminNotificationsController, UserNotificationsController],
  providers: [NotificationsService, NotificationsRepository, NotificationsGateway, NotificationSchedulerWorker],
  exports: [NotificationsService],
})
export class NotificationsModule {}
