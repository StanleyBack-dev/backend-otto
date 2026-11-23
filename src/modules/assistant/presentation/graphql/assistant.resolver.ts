import { ParseUUIDPipe } from "@nestjs/common";
import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { PageInput } from "@/common/graphql/pagination.graphql";
import { AskAssistantUseCase } from "@/modules/assistant/application/use-cases/ask-assistant.use-case";
import { MyConversationsUseCase } from "@/modules/assistant/application/use-cases/my-conversations.use-case";
import { AskInput } from "@/modules/assistant/presentation/graphql/dto/inputs/ask.input";
import { AskResultOutput } from "@/modules/assistant/presentation/graphql/dto/outputs/ask-result.output";
import { ConversationPage } from "@/modules/assistant/presentation/graphql/dto/outputs/conversation.output";
import { MessagePage } from "@/modules/assistant/presentation/graphql/dto/outputs/message.output";
import {
  toConversationOutput,
  toMessageOutput,
} from "@/modules/assistant/presentation/graphql/mappers/conversation.mapper";

@Resolver()
export class AssistantResolver {
  constructor(
    private readonly askAssistant: AskAssistantUseCase,
    private readonly conversations: MyConversationsUseCase,
  ) {}

  @Mutation(() => AskResultOutput, {
    description: "Faz uma pergunta ao assistente.",
  })
  async ask(
    @CurrentUser() user: AuthenticatedUser,
    @Args("input") input: AskInput,
  ): Promise<AskResultOutput> {
    const result = await this.askAssistant.execute(user, input);
    return {
      conversation: toConversationOutput(result.conversation),
      question: toMessageOutput(result.question),
      answer: toMessageOutput(result.answer),
      toolsUsed: result.toolsUsed,
    };
  }

  @Query(() => ConversationPage, {
    description: "Conversas, da mais recente para a mais antiga.",
  })
  async myConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Args("page", { nullable: true }) page?: PageInput,
  ): Promise<ConversationPage> {
    const result = await this.conversations.list(user, page ?? new PageInput());
    return { ...result, items: result.items.map(toConversationOutput) };
  }

  @Query(() => MessagePage, { description: "Mensagens de uma conversa." })
  async conversationMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Args("conversationId", { type: () => ID }, ParseUUIDPipe)
    conversationId: string,
    @Args("page", { nullable: true }) page?: PageInput,
  ): Promise<MessagePage> {
    const result = await this.conversations.messages(
      user,
      conversationId,
      page ?? new PageInput(),
    );
    return { ...result, items: result.items.map(toMessageOutput) };
  }

  @Mutation(() => Boolean)
  async deleteConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Args("conversationId", { type: () => ID }, ParseUUIDPipe)
    conversationId: string,
  ): Promise<boolean> {
    await this.conversations.delete(user, conversationId);
    return true;
  }
}
