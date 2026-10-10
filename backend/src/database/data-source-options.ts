import { DataSourceOptions } from 'typeorm';

type Environment = NodeJS.ProcessEnv;

export function createDataSourceOptions(env: Environment = process.env): DataSourceOptions {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  return {
    type: 'postgres',
    url: env.DATABASE_URL,
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    extra: {
      max: Number(env.DB_POOL_MAX ?? 10),
      connectionTimeoutMillis: Number(env.DB_CONNECT_TIMEOUT_MS ?? 5000),
    },
    synchronize: false,
    migrationsRun: false,
    logging: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    entities: [`${__dirname}/../modules/**/*.entity{.ts,.js}`],
    migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  };
}
