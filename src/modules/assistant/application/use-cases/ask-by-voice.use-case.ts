import { Inject, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import {
  LLM,
  LlmError,
  type LlmPort,
} from "@/modules/assistant/application/ports/llm.port";
import {
  AskAssistantUseCase,
  type AskResult,
} from "@/modules/assistant/application/use-cases/ask-assistant.use-case";
import {
  cleanTranscript,
  isSilentWav,
  parseVoiceAudio,
} from "@/modules/assistant/domain/voice-audio";
import { MySettingsUseCase } from "@/modules/identity/application/use-cases/my-settings.use-case";

// A spoken question: the AI model transcribes it in the owner's language,
// then it is asked like a typed one (the transcript is the stored question).
@Injectable()
export class AskByVoiceUseCase {
  constructor(
    @Inject(LLM) private readonly llm: LlmPort,
    private readonly ask: AskAssistantUseCase,
    private readonly settings: MySettingsUseCase,
  ) {}

  async execute(
    user: AuthenticatedUser,
    input: {
      audioBase64: string;
      mimeType: string;
      conversationId?: string | null;
    },
  ): Promise<AskResult> {
    const parsed = parseVoiceAudio(input.audioBase64, input.mimeType);
    if (!parsed.ok) {
      throw AppException.from(APP_ERRORS.assistant.invalidAudio, {
        reason: parsed.reason,
      });
    }
    if (
      parsed.audio.mimeType === "audio/wav" &&
      isSilentWav(Buffer.from(parsed.audio.base64, "base64"))
    ) {
      throw AppException.from(APP_ERRORS.assistant.noSpeech, undefined);
    }
    const { language, assistantName } = await this.settings.forUser(user.id);

    let transcript: string;
    try {
      transcript = cleanTranscript(
        await this.llm.transcribe(parsed.audio, language, [assistantName]),
      );
    } catch (error) {
      if (!(error instanceof LlmError)) throw error;
      if (error.reason === "INVALID_INPUT") {
        throw AppException.from(APP_ERRORS.assistant.invalidAudio, {
          reason: "Não consegui ler o áudio. Fale de novo.",
        });
      }
      throw AppException.from(
        error.reason === "QUOTA"
          ? APP_ERRORS.assistant.quotaExceeded
          : APP_ERRORS.assistant.unavailable,
        undefined,
      );
    }
    if (!transcript) {
      throw AppException.from(APP_ERRORS.assistant.noSpeech, undefined);
    }
    return this.ask.execute(user, {
      text: transcript,
      conversationId: input.conversationId,
    });
  }
}
