export default () => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    frontendOrigin: process.env.FRONTEND_ORIGIN,
  },
  database: {
    url: process.env.DATABASE_URL,
    poolMax: Number(process.env.DB_POOL_MAX ?? 10),
    connectTimeoutMs: Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 5000),
    ssl: process.env.DB_SSL === 'true',
  },
});
