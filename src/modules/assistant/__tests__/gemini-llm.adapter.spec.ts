import type { ConfigService } from "@nestjs/config";
import {
  LlmError,
  type LlmRequest,
} from "@/modules/assistant/application/ports/llm.port";
import { GeminiLlmAdapter } from "@/modules/assistant/infrastructure/llm/gemini-llm.adapter";

const config = (key = "test-key") =>
  ({
    get: (name: string) =>
      name === "GEMINI_API_KEY" ? key : "gemini-test-model",
  }) as unknown as ConfigService;

function reply(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

function request(overrides: Partial<LlmRequest> = {}): LlmRequest {
  return {
    system: "be brief",
    turns: [{ role: "user", text: "Qual o clima agora?" }],
    tools: [
      {
        name: "current_weather",
        description: "Weather now",
        parameters: { type: "object", properties: {} },
      },
    ],
    runTool: jest.fn().mockResolvedValue({ temperature: 27 }),
    maxToolRounds: 4,
    ...overrides,
  };
}

describe("GeminiLlmAdapter", () => {
  afterEach(() => jest.restoreAllMocks());

  it("answers with the text parts, ignoring thoughts", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation(() =>
      reply(200, {
        candidates: [
          {
            content: {
              role: "model",
              parts: [{ text: "pensando", thought: true }, { text: "Oi!" }],
            },
          },
        ],
      }),
    );
    const answer = await new GeminiLlmAdapter(config()).chat(request());
    expect(answer).toEqual({ text: "Oi!", toolsUsed: [] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("gemini-test-model:generateContent");
    const body = JSON.parse(String(init?.body));
    expect(body.systemInstruction.parts[0].text).toBe("be brief");
    expect(body.tools[0].functionDeclarations[0].name).toBe("current_weather");
  });

  it("runs the tool and sends the model turn back with its signature", async () => {
    const callPart = {
      functionCall: { id: "c1", name: "current_weather", args: {} },
      thoughtSignature: "sig-123",
    };
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementationOnce(() =>
        reply(200, {
          candidates: [{ content: { role: "model", parts: [callPart] } }],
        }),
      )
      .mockImplementationOnce(() =>
        reply(200, {
          candidates: [
            { content: { role: "model", parts: [{ text: "Faz 27 graus." }] } },
          ],
        }),
      );
    const req = request();
    const answer = await new GeminiLlmAdapter(config()).chat(req);

    expect(answer).toEqual({
      text: "Faz 27 graus.",
      toolsUsed: ["current_weather"],
    });
    expect(req.runTool).toHaveBeenCalledWith("current_weather", {});
    const second = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(second.contents[1]).toEqual({ role: "model", parts: [callPart] });
    expect(second.contents[2]).toEqual({
      role: "user",
      parts: [
        {
          functionResponse: {
            id: "c1",
            name: "current_weather",
            response: { result: { temperature: 27 } },
          },
        },
      ],
    });
  });

  it("turns the tools off once the rounds are used up", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementationOnce(() =>
        reply(200, {
          candidates: [
            {
              content: {
                role: "model",
                parts: [{ functionCall: { name: "current_weather" } }],
              },
            },
          ],
        }),
      )
      .mockImplementationOnce(() =>
        reply(200, {
          candidates: [{ content: { role: "model", parts: [{ text: "Ok" }] } }],
        }),
      );
    await new GeminiLlmAdapter(config()).chat(request({ maxToolRounds: 1 }));
    const second = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(second.toolConfig.functionCallingConfig.mode).toBe("NONE");
  });

  it("maps the provider errors", async () => {
    await expect(
      new GeminiLlmAdapter(config("")).chat(request()),
    ).rejects.toMatchObject({ reason: "NOT_CONFIGURED" });

    jest
      .spyOn(global, "fetch")
      .mockImplementationOnce(() =>
        reply(429, { error: { status: "RESOURCE_EXHAUSTED" } }),
      )
      .mockImplementationOnce(() =>
        reply(400, { error: { message: "API key not valid" } }),
      )
      .mockImplementationOnce(() => reply(503, { error: {} }))
      .mockImplementationOnce(() => Promise.reject(new Error("timeout")));
    const adapter = new GeminiLlmAdapter(config());
    for (const reason of [
      "QUOTA",
      "NOT_CONFIGURED",
      "UNAVAILABLE",
      "UNAVAILABLE",
    ]) {
      const error = await adapter.chat(request()).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(LlmError);
      expect((error as LlmError).reason).toBe(reason);
    }
  });
});
