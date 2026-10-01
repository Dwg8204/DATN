import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDataSourceOptions } from './data-source-options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createDataSourceOptions({
          ...process.env,
          DATABASE_URL: config.getOrThrow<string>('DATABASE_URL'),
          DB_POOL_MAX: String(config.get<number>('DB_POOL_MAX', 10)),
          DB_CONNECT_TIMEOUT_MS: String(config.get<number>('DB_CONNECT_TIMEOUT_MS', 5000)),
          DB_SSL: String(config.get<boolean>('DB_SSL', false)),
        }),
    }),
  ],
})
export class DatabaseModule {}
