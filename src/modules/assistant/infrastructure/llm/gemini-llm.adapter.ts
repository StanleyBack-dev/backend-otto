import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { redact } from "@/common/logging/redact";
import {
  LlmError,
  type LlmAnswer,
  type LlmPort,
  type LlmRequest,
} from "@/modules/assistant/application/ports/llm.port";
import { NO_SPEECH_MARK } from "@/modules/assistant/domain/voice-audio";

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
// Two calls (tool round + answer) must fit in the 60 s Vercel function.
const TIMEOUT_MS = 30_000;

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: { id?: string; name: string; args?: Record<string, unknown> };
  functionResponse?: {
    id?: string;
    name: string;
    response: Record<string, unknown>;
  };
};

type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

type GeminiResponse = {
  candidates?: { content?: GeminiContent; finishReason?: string }[];
  error?: { code?: number; status?: string; message?: string };
};

// Gemini (Google AI Studio) through the REST generateContent endpoint.
// Tool calls: the model turn is sent back exactly as received, because
// Gemini 3+ requires its thought signatures on the function call parts, and
// all the responses of a round go together in one user turn.
@Injectable()
export class GeminiLlmAdapter implements LlmPort {
  private readonly logger = new Logger(GeminiLlmAdapter.name);
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>("GEMINI_API_KEY") ?? "";
    this.model = config.get<string>("GEMINI_MODEL") ?? "gemini-3.5-flash-lite";
  }

  async chat(request: LlmRequest): Promise<LlmAnswer> {
    if (!this.apiKey) {
      throw new LlmError("NOT_CONFIGURED", "GEMINI_API_KEY is not set.");
    }
    const contents: GeminiContent[] = request.turns.map((turn) => ({
      role: turn.role === "user" ? "user" : "model",
      parts: [{ text: turn.text }],
    }));
    const toolsUsed: string[] = [];

    for (let round = 0; ; round++) {
      // Out of rounds: the model must answer with what it has.
      const allowTools =
        request.tools.length > 0 && round < request.maxToolRounds;
      const content = await this.generate(request, contents, allowTools);
      const calls = content.parts.filter((part) => part.functionCall);
      if (calls.length === 0) {
        const text = content.parts
          .filter((part) => part.text && !part.thought)
          .map((part) => part.text)
          .join("")
          .trim();
        return { text, toolsUsed };
      }
      contents.push(content);
      const responses: GeminiPart[] = [];
      for (const part of calls) {
        const call = part.functionCall as NonNullable<
          GeminiPart["functionCall"]
        >;
        toolsUsed.push(call.name);
        const result = await request.runTool(call.name, call.args ?? {});
        responses.push({
          functionResponse: {
            ...(call.id ? { id: call.id } : {}),
            name: call.name,
            response: { result },
          },
        });
      }
      contents.push({ role: "user", parts: responses });
    }
  }

  private async generate(
    request: LlmRequest,
    contents: GeminiContent[],
    allowTools: boolean,
  ): Promise<GeminiContent> {
    const body = {
      systemInstruction: { parts: [{ text: request.system }] },
      contents,
      ...(request.tools.length > 0
        ? {
            tools: [{ functionDeclarations: request.tools }],
            toolConfig: {
              functionCallingConfig: { mode: allowTools ? "AUTO" : "NONE" },
            },
          }
        : {}),
      // Thinking models count their reasoning in this budget: keep room for it.
      generationConfig: { temperature: 0.6, maxOutputTokens: 4096 },
    };
    return this.post(body);
  }

  async transcribe(
    audio: { base64: string; mimeType: string },
    language: string,
    vocabulary: string[] = [],
  ): Promise<string> {
    const names = vocabulary.filter(Boolean).join(", ");
    if (!this.apiKey) {
      throw new LlmError("NOT_CONFIGURED", "GEMINI_API_KEY is not set.");
    }
    const content = await this.post({
      systemInstruction: {
        parts: [
          {
            text: `Transcribe the speech in the audio exactly as said, in its language (usually ${language}). Return only the transcript as plain text, with punctuation.${names ? ` Words that may be said, spell them like this: ${names}.` : ""} Never guess or invent words: if there is no intelligible speech (silence, noise, music), answer exactly ${NO_SPEECH_MARK}.`,
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: audio.mimeType, data: audio.base64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0, maxOutputTokens: 2048 },
    }).catch((error: unknown) => {
      // No candidate text at all means nothing was heard.
      if (error instanceof LlmError && error.message.startsWith("Empty")) {
        return { role: "model" as const, parts: [] };
      }
      throw error;
    });
    return content.parts
      .filter((part) => part.text && !part.thought)
      .map((part) => part.text)
      .join("")
      .trim();
  }

  private async post(body: Record<string, unknown>): Promise<GeminiContent> {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/${this.model}:generateContent`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw new LlmError(
        "UNAVAILABLE",
        `Request failed: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }

    const payload = (await response.json().catch(() => ({}))) as GeminiResponse;
    if (!response.ok) {
      const detail = redact(
        `${response.status} ${payload.error?.status ?? ""} ${payload.error?.message ?? ""}`,
      ).slice(0, 300);
      this.logger.warn(`Gemini error: ${detail}`);
      if (response.status === 429) throw new LlmError("QUOTA", detail);
      if (
        response.status === 401 ||
        response.status === 403 ||
        /API_KEY|API key/i.test(payload.error?.message ?? "")
      ) {
        throw new LlmError("NOT_CONFIGURED", detail);
      }
      if (
        response.status === 400 &&
        /media|file|audio|unable to process input/i.test(
          payload.error?.message ?? "",
        )
      ) {
        throw new LlmError("INVALID_INPUT", detail);
      }
      throw new LlmError("UNAVAILABLE", detail);
    }

    const content = payload.candidates?.[0]?.content;
    if (!content?.parts?.length) {
      throw new LlmError(
        "UNAVAILABLE",
        `Empty answer (${payload.candidates?.[0]?.finishReason ?? "no candidate"}).`,
      );
    }
    return { role: "model", parts: content.parts };
  }
}
