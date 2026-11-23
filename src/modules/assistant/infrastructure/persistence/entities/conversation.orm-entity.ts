import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("tb_conversations")
export class ConversationOrmEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_conversations" })
  id!: string;

  @Column({ name: "idtb_users", type: "uuid" })
  userId!: string;

  @Column({ type: "varchar", length: 80 })
  title!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  // Set by the repository when a message is added (last use).
  @Column({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
