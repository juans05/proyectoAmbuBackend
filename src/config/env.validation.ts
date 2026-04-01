import * as Joi from 'joi'

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_REPLICA_HOST: Joi.string().default('localhost'),
  DB_REPLICA_PORT: Joi.number().default(5432),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().required(),

  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),

  GOOGLE_MAPS_API_KEY: Joi.string().required(),
  CLAUDE_API_KEY: Joi.string().required(),
  CLAUDE_MODEL: Joi.string().default('claude-sonnet-4-6'),

  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIREBASE_PRIVATE_KEY: Joi.string().required(),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().required(),

  CULQI_PUBLIC_KEY: Joi.string().required(),
  CULQI_SECRET_KEY: Joi.string().required(),

  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),

  PRICE_TYPE_I: Joi.number().default(100),
  PRICE_TYPE_II: Joi.number().default(150),
  PRICE_TYPE_III: Joi.number().default(350),
  SUBSCRIPTION_DISCOUNT: Joi.number().default(0.20),
  PLATFORM_COMMISSION: Joi.number().default(0.12),

  MAX_DISPATCH_RADIUS_KM: Joi.number().default(5),
  DISPATCH_TIMEOUT_SECONDS: Joi.number().default(30),
})
