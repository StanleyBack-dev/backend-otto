import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("tb_news_sources")
export class NewsSourceOrmEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_news_sources" })
  id!: string;

  @Column({ name: "idtb_users", type: "uuid" })
  userId!: string;

  @Column({ type: "varchar", length: 60 })
  name!: string;

  @Column({ type: "varchar", length: 1000 })
  url!: string;

  @Column({ type: "varchar", length: 40 })
  category!: string;

  @Column({ type: "boolean", default: true })
  active!: boolean;

  @Column({ name: "last_fetched_at", type: "timestamptz", nullable: true })
  lastFetchedAt!: Date | null;

  @Column({ name: "last_error", type: "varchar", length: 300, nullable: true })
  lastError!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
