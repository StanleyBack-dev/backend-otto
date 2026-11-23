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
});
