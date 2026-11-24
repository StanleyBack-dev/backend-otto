import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AssistantConfig } from "@/modules/assistant/application/assistant.config";
import { AssistantToolRegistry } from "@/modules/assistant/application/assistant-tool.registry";
import { CONVERSATION_REPOSITORY } from "@/modules/assistant/application/ports/conversation-repository.port";
import { LLM } from "@/modules/assistant/application/ports/llm.port";
import { AskAssistantUseCase } from "@/modules/assistant/application/use-cases/ask-assistant.use-case";
import { MyConversationsUseCase } from "@/modules/assistant/application/use-cases/my-conversations.use-case";
import { GeminiLlmAdapter } from "@/modules/assistant/infrastructure/llm/gemini-llm.adapter";
import { ConversationOrmEntity } from "@/modules/assistant/infrastructure/persistence/entities/conversation.orm-entity";
import { MessageOrmEntity } from "@/modules/assistant/infrastructure/persistence/entities/message.orm-entity";
import { ConversationTypeormRepository } from "@/modules/assistant/infrastructure/persistence/repositories/conversation-typeorm.repository";
import { AssistantResolver } from "@/modules/assistant/presentation/graphql/assistant.resolver";
import { IdentityModule } from "@/modules/identity/identity.module";

// Questions and answers: the AI model, the conversation history and the
// tool registry the feature modules (weather, agenda, news) plug into.
@Module({
  imports: [
    TypeOrmModule.forFeature([ConversationOrmEntity, MessageOrmEntity]),
    IdentityModule,
  ],
  providers: [
    AssistantConfig,
    AssistantToolRegistry,
    AskAssistantUseCase,
    MyConversationsUseCase,
    AssistantResolver,
    { provide: LLM, useClass: GeminiLlmAdapter },
    {
      provide: CONVERSATION_REPOSITORY,
      useClass: ConversationTypeormRepository,
    },
  ],
  exports: [AssistantToolRegistry, LLM],
})
export class AssistantModule {}
