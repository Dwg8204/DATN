import * as Joi from 'joi';

export const environmentSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().pattern(/^[a-z0-9/-]+$/).default('api/v1'),
  FRONTEND_ORIGIN: Joi.string().uri().required(),
  LOG_LEVEL: Joi.string().valid('log', 'error', 'warn', 'debug', 'verbose').default('log'),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
  DB_POOL_MAX: Joi.number().integer().min(1).max(100).default(10),
  DB_CONNECT_TIMEOUT_MS: Joi.number().integer().min(500).default(5000),
  DB_SSL: Joi.boolean().truthy('true').falsy('false').default(false),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ISSUER: Joi.string().required(),
  JWT_AUDIENCE: Joi.string().required(),
  ACCESS_TOKEN_TTL_SECONDS: Joi.number().integer().min(60).default(900),
  REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().min(1).default(7),
}).unknown(true);
