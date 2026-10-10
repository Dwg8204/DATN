import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminDashboardRepository } from './repositories/admin-dashboard.repository';
import { AdminDashboardService } from './services/admin-dashboard.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardRepository, AdminDashboardService],
})
export class AdminDashboardModule {}
