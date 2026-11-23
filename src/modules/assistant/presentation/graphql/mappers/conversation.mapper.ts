import type {
  Conversation,
  Message,
} from "@/modules/assistant/domain/conversation";
import type { ConversationOutput } from "@/modules/assistant/presentation/graphql/dto/outputs/conversation.output";
import type { MessageOutput } from "@/modules/assistant/presentation/graphql/dto/outputs/message.output";

export function toConversationOutput(
  conversation: Conversation,
): ConversationOutput {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

export function toMessageOutput(message: Message): MessageOutput {
  return {
    id: message.id,
    role: message.role,
    text: message.text,
    createdAt: message.createdAt,
  };
}
