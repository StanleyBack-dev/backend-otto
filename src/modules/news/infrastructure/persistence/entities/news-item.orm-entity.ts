import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("tb_news_items")
export class NewsItemOrmEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_news_items" })
  id!: string;

  @Column({ name: "idtb_news_sources", type: "uuid" })
  sourceId!: string;

  @Column({ type: "varchar", length: 300 })
  title!: string;

  @Column({ type: "varchar", length: 1000 })
  link!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  summary!: string | null;

  /** From the feed; the collection time when the feed has none. */
  @Column({ name: "published_at", type: "timestamptz" })
  publishedAt!: Date;

  @Column({ name: "collected_at", type: "timestamptz" })
  collectedAt!: Date;
}
