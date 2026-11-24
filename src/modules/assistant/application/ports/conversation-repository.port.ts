import type {
  Conversation,
  Message,
  MessageRole,
} from "@/modules/assistant/domain/conversation";
import type { PageRequest, Paginated } from "@/shared/application/pagination";

export interface ConversationRepositoryPort {
  create(userId: string, title: string, now: Date): Promise<Conversation>;
  findById(id: string): Promise<Conversation | null>;
  /** Most recently used first. */
  page(userId: string, page: PageRequest): Promise<Paginated<Conversation>>;
  delete(id: string): Promise<void>;
  /** Stores the turns in order and marks the conversation as used. */
  append(
    conversationId: string,
    turns: { role: MessageRole; text: string }[],
    now: Date,
  ): Promise<Message[]>;
  /** The last `limit` messages, oldest first (context for the model). */
  recentMessages(conversationId: string, limit: number): Promise<Message[]>;
  /** Oldest first, like a chat. */
  pageMessages(
    conversationId: string,
    page: PageRequest,
  ): Promise<Paginated<Message>>;
}

export const CONVERSATION_REPOSITORY = Symbol("CONVERSATION_REPOSITORY");
