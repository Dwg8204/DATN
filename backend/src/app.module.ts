import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { environmentSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './features/auth/auth.module';
import { AppController } from './app.controller';
import { SpeakingTestsModule } from './features/speaking-tests/speaking-tests.module';
import { UsersModule } from './features/users/users.module';
import { GrammarTestsModule } from './features/grammar-tests/grammar-tests.module';
import { ListeningTestsModule } from './features/listening-tests/listening-tests.module';
import { MediaModule } from './features/media/media.module';
import { WritingTestsModule } from './features/writing-tests/writing-tests.module';
import { AdminDashboardModule } from './features/admin-dashboard/admin-dashboard.module';
import { StorageModule } from './common/storage/storage.module';
import { ProfileModule } from './features/profile/profile.module';
import { TestAttemptsModule } from './features/test-attempts/test-attempts.module';
import { AccountThrottlerGuard } from './common/guards/account-throttler.guard';
import { ReadingModule } from './features/reading/reading.module';
import { NotificationsModule } from './features/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, load: [configuration], validationSchema: environmentSchema }),
    DatabaseModule,
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    AuthModule,
    UsersModule,
    SpeakingTestsModule,
    GrammarTestsModule,
    MediaModule,
    WritingTestsModule,
    AdminDashboardModule,
    ListeningTestsModule,
    ReadingModule,
    NotificationsModule,
    HealthModule,
    StorageModule,
    ProfileModule,
    TestAttemptsModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: AccountThrottlerGuard }],
})
export class AppModule {}
