import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import type { MessageRole } from "@/modules/assistant/domain/conversation";

@Entity("tb_messages")
export class MessageOrmEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_messages" })
  id!: string;

  @Column({ name: "idtb_conversations", type: "uuid" })
  conversationId!: string;

  @Column({ type: "varchar", length: 10 })
  role!: MessageRole;

  @Column({ type: "text" })
  text!: string;

  // Set by the repository so the two turns of an answer keep their order.
  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
