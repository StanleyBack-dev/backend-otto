import type { ToolParameters } from "@/modules/assistant/domain/assistant-tool";

// The AI model behind the assistant. Gemini today; another provider is a new
// adapter. The adapter runs the tool loop itself, because each provider has
// its own way to chain tool calls (e.g. Gemini thought signatures).
export type ChatTurn = { role: "user" | "assistant"; text: string };

export type ToolDeclaration = {
  name: string;
  description: string;
  parameters: ToolParameters;
};

export type LlmRequest = {
  system: string;
  /** Oldest first; the last turn is the new question. */
  turns: ChatTurn[];
  tools: ToolDeclaration[];
  /** Runs a tool the model asked for; never throws (errors become data). */
  runTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  /** Tool rounds allowed before the model must answer. */
  maxToolRounds: number;
};

export type LlmAnswer = { text: string; toolsUsed: string[] };

/** INVALID_INPUT: the model refused the content (e.g. unreadable audio). */
export type LlmFailure =
  "NOT_CONFIGURED" | "QUOTA" | "INVALID_INPUT" | "UNAVAILABLE";

export class LlmError extends Error {
  constructor(
    readonly reason: LlmFailure,
    message: string,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

export interface LlmPort {
  /** Throws LlmError when the model cannot answer. */
  chat(request: LlmRequest): Promise<LlmAnswer>;
  /**
   * What was said in a short recording ("" when there is no speech).
   * Throws LlmError when the model cannot answer.
   */
  transcribe(
    audio: { base64: string; mimeType: string },
    language: string,
    /** Names likely to be said (the assistant name), spelled right. */
    vocabulary?: string[],
  ): Promise<string>;
}

export const LLM = Symbol("LLM");
