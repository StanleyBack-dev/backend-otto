import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { BriefingSections } from "@/modules/briefing/domain/briefing";

@Entity("tb_briefings")
export class BriefingOrmEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_briefings" })
  id!: string;

  @Column({ name: "idtb_users", type: "uuid" })
  userId!: string;

  /** Local date in the owner's time zone (YYYY-MM-DD). */
  @Column({ name: "local_date", type: "date" })
  date!: string;

  @Column({ type: "text" })
  text!: string;

  @Column({ type: "jsonb" })
  sections!: BriefingSections;

  @Column({ name: "written_by_model", type: "boolean" })
  writtenByModel!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
