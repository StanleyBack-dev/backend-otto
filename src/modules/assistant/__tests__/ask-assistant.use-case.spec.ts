import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { AppException } from "@/common/exceptions/app-exception";
import type { AssistantConfig } from "@/modules/assistant/application/assistant.config";
import { AssistantToolRegistry } from "@/modules/assistant/application/assistant-tool.registry";
import type { ConversationRepositoryPort } from "@/modules/assistant/application/ports/conversation-repository.port";
import {
  LlmError,
  type LlmPort,
  type LlmRequest,
} from "@/modules/assistant/application/ports/llm.port";
import { AskAssistantUseCase } from "@/modules/assistant/application/use-cases/ask-assistant.use-case";
import {
  MessageRole,
  type Conversation,
  type Message,
} from "@/modules/assistant/domain/conversation";
import type { MySettingsUseCase } from "@/modules/identity/application/use-cases/my-settings.use-case";
import { DEFAULT_SETTINGS } from "@/modules/identity/domain/user-settings";

const NOW = new Date("2026-11-23T15:00:00Z");
const user: AuthenticatedUser = {
  id: "u1",
  deviceId: "d1",
  name: "Stanley",
  email: "owner@example.com",
};

class InMemoryConversations implements ConversationRepositoryPort {
  conversations: Conversation[] = [];
  messages: Message[] = [];
  create(userId: string, title: string, now: Date) {
    const c = {
      id: `c${this.conversations.length + 1}`,
      userId,
      title,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.push(c);
    return Promise.resolve(c);
  }
  findById = (id: string) =>
    Promise.resolve(this.conversations.find((c) => c.id === id) ?? null);
  page = () => Promise.reject(new Error("unused"));
  delete = () => Promise.resolve();
  append(
    conversationId: string,
    turns: { role: MessageRole; text: string }[],
    now: Date,
  ) {
    const saved = turns.map((t, i) => ({
      id: `m${this.messages.length + i + 1}`,
      conversationId,
      ...t,
      createdAt: new Date(now.getTime() + i),
    }));
    this.messages.push(...saved);
    return Promise.resolve(saved);
  }
  recentMessages = (conversationId: string, limit: number) =>
    Promise.resolve(
      this.messages
        .filter((m) => m.conversationId === conversationId)
        .slice(-limit),
    );
  pageMessages = () => Promise.reject(new Error("unused"));
}

function setup(llm: Pick<LlmPort, "chat">) {
  const conversations = new InMemoryConversations();
  const tools = new AssistantToolRegistry();
  const settings = {
    forUser: () =>
      Promise.resolve({
        ...DEFAULT_SETTINGS,
        location: {
          name: "Goiânia - GO",
          latitude: -16.7,
          longitude: -49.3,
          updatedAt: NOW,
        },
      }),
  } as unknown as MySettingsUseCase;
  const config = { historyMessages: 12, maxToolRounds: 4 } as AssistantConfig;
  const useCase = new AskAssistantUseCase(
    { transcribe: jest.fn(), ...llm },
    conversations,
    { now: () => NOW },
    tools,
    settings,
    config,
  );
  return { useCase, conversations, tools };
}

const codeOf = (error: unknown) =>
  error instanceof AppException
    ? (error.getResponse() as { code: string }).code
    : undefined;

describe("AskAssistantUseCase", () => {
  it("starts a conversation and stores the question and the answer", async () => {
    const chat = jest
      .fn<Promise<{ text: string; toolsUsed: string[] }>, [LlmRequest]>()
      .mockResolvedValue({
        text: "Um controller recebe as requisições.",
        toolsUsed: [],
      });
    const { useCase, conversations } = setup({ chat });

    const result = await useCase.execute(user, {
      text: "  O que é um controller? ",
    });

    expect(result.conversation.title).toBe("O que é um controller?");
    expect(result.answer.text).toBe("Um controller recebe as requisições.");
    expect(conversations.messages.map((m) => m.role)).toEqual([
      MessageRole.USER,
      MessageRole.ASSISTANT,
    ]);
    const request = chat.mock.calls[0][0];
    expect(request.system).toContain("Stanley");
    expect(request.system).toContain("Goiânia - GO");
    expect(request.turns).toEqual([
      { role: "user", text: "O que é um controller?" },
    ]);
  });

  it("sends the earlier messages as context when continuing", async () => {
    const chat = jest
      .fn<Promise<{ text: string; toolsUsed: string[] }>, [LlmRequest]>()
      .mockResolvedValueOnce({ text: "Primeira", toolsUsed: [] })
      .mockResolvedValueOnce({ text: "Segunda", toolsUsed: [] });
    const { useCase } = setup({ chat });
    const first = await useCase.execute(user, { text: "Oi" });
    await useCase.execute(user, {
      text: "E agora?",
      conversationId: first.conversation.id,
    });
    expect(chat.mock.calls[1][0].turns).toEqual([
      { role: "user", text: "Oi" },
      { role: "assistant", text: "Primeira" },
      { role: "user", text: "E agora?" },
    ]);
  });

  it("runs registered tools with the owner context and survives their failures", async () => {
    const chat = jest.fn(async (request: LlmRequest) => {
      const ok = await request.runTool("echo_place", {});
      const failed = await request.runTool("broken", {});
      const unknown = await request.runTool("nope", {});
      return {
        text: JSON.stringify([ok, failed, unknown]),
        toolsUsed: ["echo_place"],
      };
    });
    const { useCase, tools } = setup({ chat });
    tools.register({
      name: "echo_place",
      description: "",
      parameters: { type: "object", properties: {} },
      execute: (_args, context) =>
        Promise.resolve({ place: context.location?.name }),
    });
    tools.register({
      name: "broken",
      description: "",
      parameters: { type: "object", properties: {} },
      execute: () => Promise.reject(new Error("boom")),
    });
    const result = await useCase.execute(user, { text: "Onde estou?" });
    const [ok, failed, unknown] = JSON.parse(result.answer.text);
    expect(ok).toEqual({ place: "Goiânia - GO" });
    expect(failed.error).toBeDefined();
    expect(unknown.error).toBeDefined();
    expect(chat.mock.calls[0][0].tools.map((t) => t.name)).toEqual([
      "echo_place",
      "broken",
    ]);
  });

  it("stores nothing and explains when the model fails", async () => {
    const { useCase, conversations } = setup({
      chat: () => Promise.reject(new LlmError("QUOTA", "429")),
    });
    expect(
      codeOf(await useCase.execute(user, { text: "Oi" }).catch((e) => e)),
    ).toBe("ASSISTANT_QUOTA_EXCEEDED");
    expect(conversations.conversations).toHaveLength(0);
  });

  it("rejects empty questions and conversations of someone else", async () => {
    const chat = jest.fn().mockResolvedValue({ text: "x", toolsUsed: [] });
    const { useCase } = setup({ chat });
    expect(
      codeOf(await useCase.execute(user, { text: "   " }).catch((e) => e)),
    ).toBe("ASSISTANT_INVALID_QUESTION");
    const first = await useCase.execute(user, { text: "Oi" });
    expect(
      codeOf(
        await useCase
          .execute(
            { ...user, id: "u2" },
            { text: "Oi", conversationId: first.conversation.id },
          )
          .catch((e) => e),
      ),
    ).toBe("ASSISTANT_CONVERSATION_NOT_FOUND");
  });
});
