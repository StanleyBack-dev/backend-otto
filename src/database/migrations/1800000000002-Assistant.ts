import type { MigrationInterface, QueryRunner } from "typeorm";

// Conversations with the assistant and their text messages.
export class Assistant1800000000002 implements MigrationInterface {
  name = "Assistant1800000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tb_conversations" (
        "idtb_conversations" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "idtb_users" uuid NOT NULL
          REFERENCES "tb_users" ("idtb_users") ON DELETE CASCADE,
        "title" varchar(80) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_conversations_user_updated" ON "tb_conversations" ("idtb_users", "updated_at" DESC)`,
    );
    await queryRunner.query(`
      CREATE TABLE "tb_messages" (
        "idtb_messages" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "idtb_conversations" uuid NOT NULL
          REFERENCES "tb_conversations" ("idtb_conversations") ON DELETE CASCADE,
        "role" varchar(10) NOT NULL CHECK ("role" IN ('USER', 'ASSISTANT')),
        "text" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_messages_conversation_created" ON "tb_messages" ("idtb_conversations", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_conversations"`);
  }
}
