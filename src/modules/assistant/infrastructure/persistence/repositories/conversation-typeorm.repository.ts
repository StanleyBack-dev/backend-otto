import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";
import type { ConversationRepositoryPort } from "@/modules/assistant/application/ports/conversation-repository.port";
import type {
  Conversation,
  Message,
  MessageRole,
} from "@/modules/assistant/domain/conversation";
import { ConversationOrmEntity } from "@/modules/assistant/infrastructure/persistence/entities/conversation.orm-entity";
import { MessageOrmEntity } from "@/modules/assistant/infrastructure/persistence/entities/message.orm-entity";
import {
  paginate,
  type PageRequest,
  type Paginated,
} from "@/shared/application/pagination";

@Injectable()
export class ConversationTypeormRepository implements ConversationRepositoryPort {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get conversations() {
    return this.dataSource.getRepository(ConversationOrmEntity);
  }

  private get messages() {
    return this.dataSource.getRepository(MessageOrmEntity);
  }

  create(userId: string, title: string, now: Date): Promise<Conversation> {
    return this.conversations.save(
      this.conversations.create({
        userId,
        title,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  findById(id: string): Promise<Conversation | null> {
    return this.conversations.findOneBy({ id });
  }

  async page(
    userId: string,
    page: PageRequest,
  ): Promise<Paginated<Conversation>> {
    const [items, total] = await this.conversations.findAndCount({
      where: { userId },
      order: { updatedAt: "DESC" },
      skip: (page.page - 1) * page.limit,
      take: page.limit,
    });
    return paginate(items, total, page);
  }

  async delete(id: string): Promise<void> {
    await this.conversations.delete({ id });
  }

  append(
    conversationId: string,
    turns: { role: MessageRole; text: string }[],
    now: Date,
  ): Promise<Message[]> {
    return this.dataSource.transaction(async (manager) => {
      // 1 ms apart, so "oldest first" is stable even within one answer.
      const rows = turns.map((turn, index) =>
        manager.create(MessageOrmEntity, {
          conversationId,
          role: turn.role,
          text: turn.text,
          createdAt: new Date(now.getTime() + index),
        }),
      );
      const saved = await manager.save(rows);
      await manager.update(
        ConversationOrmEntity,
        { id: conversationId },
        { updatedAt: saved[saved.length - 1].createdAt },
      );
      return saved;
    });
  }

  async recentMessages(
    conversationId: string,
    limit: number,
  ): Promise<Message[]> {
    const rows = await this.messages.find({
      where: { conversationId },
      order: { createdAt: "DESC" },
      take: limit,
    });
    return rows.reverse();
  }

  async pageMessages(
    conversationId: string,
    page: PageRequest,
  ): Promise<Paginated<Message>> {
    const [items, total] = await this.messages.findAndCount({
      where: { conversationId },
      order: { createdAt: "ASC" },
      skip: (page.page - 1) * page.limit,
      take: page.limit,
    });
    return paginate(items, total, page);
  }
}
