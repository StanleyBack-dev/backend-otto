import { Inject, Injectable, Logger } from "@nestjs/common";
import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import { reportSystemEvent } from "@/common/logging/system-events";
import { redact } from "@/common/logging/redact";
import { AssistantConfig } from "@/modules/assistant/application/assistant.config";
import { AssistantToolRegistry } from "@/modules/assistant/application/assistant-tool.registry";
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepositoryPort,
} from "@/modules/assistant/application/ports/conversation-repository.port";
import {
  LLM,
  LlmError,
  type LlmPort,
} from "@/modules/assistant/application/ports/llm.port";
import type { ToolContext } from "@/modules/assistant/domain/assistant-tool";
import {
  conversationTitle,
  MessageRole,
  normalizeQuestion,
  type Conversation,
  type Message,
} from "@/modules/assistant/domain/conversation";
import { buildSystemPrompt } from "@/modules/assistant/domain/system-prompt";
import { MySettingsUseCase } from "@/modules/identity/application/use-cases/my-settings.use-case";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

export type AskResult = {
  conversation: Conversation;
  question: Message;
  answer: Message;
  toolsUsed: string[];
};

// A question (typed or transcribed from speech) and its answer. The model
// gets the recent messages of the conversation as context and may call the
// registered tools; both turns are stored only when the answer exists.
@Injectable()
export class AskAssistantUseCase {
  private readonly logger = new Logger(AskAssistantUseCase.name);

  constructor(
    @Inject(LLM) private readonly llm: LlmPort,
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly tools: AssistantToolRegistry,
    private readonly settings: MySettingsUseCase,
    private readonly config: AssistantConfig,
  ) {}

  async execute(
    user: AuthenticatedUser,
    input: { text: string; conversationId?: string | null },
  ): Promise<AskResult> {
    const question = normalizeQuestion(input.text);
    if (!question) {
      throw AppException.from(APP_ERRORS.assistant.invalidQuestion, undefined);
    }
    const existing = input.conversationId
      ? await this.ownedConversation(user, input.conversationId)
      : null;
    const history = existing
      ? await this.conversations.recentMessages(
          existing.id,
          this.config.historyMessages,
        )
      : [];

    const settings = await this.settings.forUser(user.id);
    const now = this.clock.now();
    const context: ToolContext = {
      userId: user.id,
      timeZone: settings.timeZone,
      language: settings.language,
      location: settings.location,
      now,
    };

    const answer = await this.ask({
      system: buildSystemPrompt({
        assistantName: settings.assistantName,
        ownerName: user.name,
        language: settings.language,
        timeZone: settings.timeZone,
        locationName: settings.location?.name ?? null,
        now,
      }),
      turns: [
        ...history.map((message) => ({
          role:
            message.role === MessageRole.USER
              ? ("user" as const)
              : ("assistant" as const),
          text: message.text,
        })),
        { role: "user" as const, text: question },
      ],
      context,
    });

    const conversation =
      existing ??
      (await this.conversations.create(
        user.id,
        conversationTitle(question),
        now,
      ));
    const [storedQuestion, storedAnswer] = await this.conversations.append(
      conversation.id,
      [
        { role: MessageRole.USER, text: question },
        { role: MessageRole.ASSISTANT, text: answer.text },
      ],
      this.clock.now(),
    );
    return {
      conversation: { ...conversation, updatedAt: storedAnswer.createdAt },
      question: storedQuestion,
      answer: storedAnswer,
      toolsUsed: answer.toolsUsed,
    };
  }

  private async ask(request: {
    system: string;
    turns: { role: "user" | "assistant"; text: string }[];
    context: ToolContext;
  }) {
    try {
      const answer = await this.llm.chat({
        system: request.system,
        turns: request.turns,
        tools: this.tools.all().map(({ name, description, parameters }) => ({
          name,
          description,
          parameters,
        })),
        runTool: (name, args) => this.runTool(name, args, request.context),
        maxToolRounds: this.config.maxToolRounds,
      });
      if (!answer.text.trim()) {
        throw new LlmError("UNAVAILABLE", "The model returned no text.");
      }
      return answer;
    } catch (error) {
      if (!(error instanceof LlmError)) throw error;
      this.logger.warn(`Model failed (${error.reason}): ${error.message}`);
      if (error.reason !== "QUOTA") {
        reportSystemEvent({
          level: "ERROR",
          category: "ASSISTANT",
          source: "Assistant: model",
          message: `${error.reason}: ${error.message}`,
        });
      }
      throw AppException.from(
        error.reason === "QUOTA"
          ? APP_ERRORS.assistant.quotaExceeded
          : APP_ERRORS.assistant.unavailable,
        undefined,
      );
    }
  }

  // A failing tool must not kill the answer: the model is told it failed
  // and can say so.
  private async runTool(
    name: string,
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<Record<string, unknown>> {
    const tool = this.tools.find(name);
    if (!tool) return { error: `Unknown tool ${name}.` };
    try {
      return await tool.execute(args, context);
    } catch (error) {
      const message = redact(error instanceof Error ? error.message : "");
      this.logger.warn(`Tool ${name} failed: ${message}`);
      reportSystemEvent({
        level: "WARN",
        category: "ASSISTANT",
        source: `Assistant tool: ${name}`,
        message: message || "Tool failed.",
      });
      return { error: "This data source is not available right now." };
    }
  }

  private async ownedConversation(
    user: AuthenticatedUser,
    id: string,
  ): Promise<Conversation> {
    const conversation = await this.conversations.findById(id);
    if (!conversation || conversation.userId !== user.id) {
      throw AppException.from(
        APP_ERRORS.assistant.conversationNotFound,
        undefined,
      );
    }
    return conversation;
  }
}
