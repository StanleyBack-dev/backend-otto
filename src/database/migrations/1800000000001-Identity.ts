import type { MigrationInterface, QueryRunner } from "typeorm";

// The owner account, the signed-in devices (one session each) and the
// assistant settings (location, voice, language).
export class Identity1800000000001 implements MigrationInterface {
  name = "Identity1800000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tb_users" (
        "idtb_users" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "email" varchar(254) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "failed_login_attempts" integer NOT NULL DEFAULT 0,
        "locked_until" timestamptz,
        "active" boolean NOT NULL DEFAULT true,
        "last_login_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "tb_devices" (
        "idtb_devices" uuid PRIMARY KEY,
        "idtb_users" uuid NOT NULL
          REFERENCES "tb_users" ("idtb_users") ON DELETE CASCADE,
        "name" varchar(60) NOT NULL,
        "platform" varchar(10) NOT NULL
          CHECK ("platform" IN ('WINDOWS', 'MACOS', 'LINUX', 'ANDROID', 'IOS', 'WEB')),
        "refresh_secret_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "last_seen_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_devices_user_live" ON "tb_devices" ("idtb_users", "last_seen_at" DESC) WHERE "revoked_at" IS NULL`,
    );
    await queryRunner.query(`
      CREATE TABLE "tb_user_settings" (
        "idtb_users" uuid PRIMARY KEY
          REFERENCES "tb_users" ("idtb_users") ON DELETE CASCADE,
        "assistant_name" varchar(40) NOT NULL,
        "language" varchar(35) NOT NULL,
        "time_zone" varchar(64) NOT NULL,
        "location_name" varchar(120),
        "latitude" numeric(9, 6) CHECK ("latitude" BETWEEN -90 AND 90),
        "longitude" numeric(9, 6) CHECK ("longitude" BETWEEN -180 AND 180),
        "location_updated_at" timestamptz,
        "speech_rate" numeric(3, 2) NOT NULL
          CHECK ("speech_rate" BETWEEN 0.5 AND 2),
        "auto_speak" boolean NOT NULL,
        "wake_word_enabled" boolean NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_user_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_devices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_users"`);
  }
}
