import type { MigrationInterface, QueryRunner } from "typeorm";

// News feeds the owner follows and the headlines collected from them.
export class News1800000000003 implements MigrationInterface {
  name = "News1800000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tb_news_sources" (
        "idtb_news_sources" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "idtb_users" uuid NOT NULL
          REFERENCES "tb_users" ("idtb_users") ON DELETE CASCADE,
        "name" varchar(60) NOT NULL,
        "url" varchar(1000) NOT NULL,
        "category" varchar(40) NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "last_fetched_at" timestamptz,
        "last_error" varchar(300),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_news_sources_user_url" UNIQUE ("idtb_users", "url")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "tb_news_items" (
        "idtb_news_items" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "idtb_news_sources" uuid NOT NULL
          REFERENCES "tb_news_sources" ("idtb_news_sources") ON DELETE CASCADE,
        "title" varchar(300) NOT NULL,
        "link" varchar(1000) NOT NULL,
        "summary" varchar(500),
        "published_at" timestamptz NOT NULL,
        "collected_at" timestamptz NOT NULL,
        CONSTRAINT "uq_news_items_source_link" UNIQUE ("idtb_news_sources", "link")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_news_items_source_published" ON "tb_news_items" ("idtb_news_sources", "published_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_news_items_published" ON "tb_news_items" ("published_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_news_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_news_sources"`);
  }
}
