import * as Joi from "joi";

const bool = () => Joi.boolean().truthy("true").falsy("false");

export const envValidationSchema = Joi.object({
  // === APP ===
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().default(4100),
  APP_TIMEZONE: Joi.string().default("America/Sao_Paulo"),
  // Set by the deploy workflow: release version, git commit and deploy time.
  APP_VERSION: Joi.string().allow("").optional(),
  APP_COMMIT_SHA: Joi.string().allow("").optional(),
  APP_DEPLOYED_AT: Joi.string().allow("").optional(),

  // === DATABASE (Neon) ===
  DATABASE_URL: Joi.string()
    .uri({ scheme: ["postgres", "postgresql"] })
    .required(),
  DB_SSL: bool().default(true),
  TYPEORM_LOGGING: bool().default(false),

  // === SERVICE SECRETS ===
  // Shared secret between the Otto clients (desktop app) and this API.
  CLIENT_API_KEY: Joi.string().min(32).required(),
  // Sent by the scheduled GitHub Actions workflows as
  // `Authorization: Bearer <CRON_SECRET>`. When unset, /internal/* rejects
  // every request.
  CRON_SECRET: Joi.string().min(16).allow("").optional(),

  // === AUTH ===
  // Signs the short-lived access tokens.
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default("15m"),
  // Days a device stays signed in without use (slides on every refresh).
  REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().min(1).max(365).default(90),
  // HMAC key for the refresh secrets (only digests are stored). Rotating it
  // signs every device out.
  AUTH_HASH_SECRET: Joi.string().min(32).required(),
  AUTH_MAX_FAILED_ATTEMPTS: Joi.number().integer().min(3).max(20).default(5),
  AUTH_LOCK_MINUTES: Joi.number().integer().min(1).max(1440).default(15),

  // Owner account, created on boot while the database has no user.
  BOOTSTRAP_OWNER_ENABLED: bool().default(false),
  BOOTSTRAP_OWNER_NAME: Joi.string().allow("").optional(),
  BOOTSTRAP_OWNER_EMAIL: Joi.string().email().allow("").optional(),
  BOOTSTRAP_OWNER_PASSWORD: Joi.string().allow("").optional(),
});
