import * as Joi from 'joi';

export interface SeedAdminConfig {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  passwordHashRounds: number;
}

const seedAdminSchema = Joi.object({
  ADMIN_SEED_EMAIL: Joi.string().trim().lowercase().email().max(320).required(),
  ADMIN_SEED_PASSWORD: Joi.string()
    .min(8)
    .max(128)
    .custom((value: string, helpers: Joi.CustomHelpers) => {
      if (!value.trim()) return helpers.error('string.empty');
      return value;
    })
    .required(),
  ADMIN_SEED_FIRST_NAME: Joi.string().trim().min(1).max(100).default('System'),
  ADMIN_SEED_LAST_NAME: Joi.string().trim().min(1).max(100).default('Administrator'),
  PASSWORD_HASH_ROUNDS: Joi.number().integer().min(10).max(14).default(12),
});

export function loadSeedAdminConfig(env: NodeJS.ProcessEnv = process.env): SeedAdminConfig {
  const input = {
    ADMIN_SEED_EMAIL: env.ADMIN_SEED_EMAIL,
    ADMIN_SEED_PASSWORD: env.ADMIN_SEED_PASSWORD,
    ADMIN_SEED_FIRST_NAME: env.ADMIN_SEED_FIRST_NAME,
    ADMIN_SEED_LAST_NAME: env.ADMIN_SEED_LAST_NAME,
    PASSWORD_HASH_ROUNDS: env.PASSWORD_HASH_ROUNDS,
  };
  const { error, value } = seedAdminSchema.validate(input, { abortEarly: false, stripUnknown: true });

  if (error) {
    const fields = error.details.map(detail => detail.path.join('.')).join(', ');
    throw new Error(`Invalid administrator seed configuration. Check: ${fields}.`);
  }

  return {
    email: value.ADMIN_SEED_EMAIL as string,
    password: value.ADMIN_SEED_PASSWORD as string,
    firstName: value.ADMIN_SEED_FIRST_NAME as string,
    lastName: value.ADMIN_SEED_LAST_NAME as string,
    passwordHashRounds: value.PASSWORD_HASH_ROUNDS as number,
  };
}
