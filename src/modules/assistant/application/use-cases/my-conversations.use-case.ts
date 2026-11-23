import { Inject, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepositoryPort,
} from "@/modules/assistant/application/ports/conversation-repository.port";
import type {
  Conversation,
  Message,
} from "@/modules/assistant/domain/conversation";
import type { PageRequest, Paginated } from "@/shared/application/pagination";

// The conversation history: list, read and delete.
@Injectable()
export class MyConversationsUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepositoryPort,
  ) {}

  list(
    user: AuthenticatedUser,
    page: PageRequest,
  ): Promise<Paginated<Conversation>> {
    return this.conversations.page(user.id, page);
  }

  async messages(
    user: AuthenticatedUser,
    conversationId: string,
    page: PageRequest,
  ): Promise<Paginated<Message>> {
    await this.owned(user, conversationId);
    return this.conversations.pageMessages(conversationId, page);
  }

  async delete(user: AuthenticatedUser, conversationId: string): Promise<void> {
    await this.owned(user, conversationId);
    await this.conversations.delete(conversationId);
  }

  private async owned(user: AuthenticatedUser, id: string): Promise<void> {
    const conversation = await this.conversations.findById(id);
    if (!conversation || conversation.userId !== user.id) {
      throw AppException.from(
        APP_ERRORS.assistant.conversationNotFound,
        undefined,
      );
    }
  }
}
