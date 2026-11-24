import type { MigrationInterface, QueryRunner } from "typeorm";

// The morning briefing: its time in the settings and one briefing per owner
// and local date.
export class Briefing1800000000004 implements MigrationInterface {
  name = "Briefing1800000000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tb_user_settings"
        ADD COLUMN "briefing_enabled" boolean NOT NULL DEFAULT true,
        ADD COLUMN "briefing_time" varchar(5) NOT NULL DEFAULT '07:00'
          CHECK ("briefing_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    `);
    await queryRunner.query(`
      CREATE TABLE "tb_briefings" (
        "idtb_briefings" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "idtb_users" uuid NOT NULL
          REFERENCES "tb_users" ("idtb_users") ON DELETE CASCADE,
        "local_date" date NOT NULL,
        "text" text NOT NULL,
        "sections" jsonb NOT NULL,
        "written_by_model" boolean NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_briefings_user_date" UNIQUE ("idtb_users", "local_date")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_briefings"`);
    await queryRunner.query(`
      ALTER TABLE "tb_user_settings"
        DROP COLUMN IF EXISTS "briefing_time",
        DROP COLUMN IF EXISTS "briefing_enabled"
    `);
  }
}
