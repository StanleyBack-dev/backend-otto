import type { ConfigService } from "@nestjs/config";
import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { AppException } from "@/common/exceptions/app-exception";
import { LlmError } from "@/modules/assistant/application/ports/llm.port";
import type { AskAssistantUseCase } from "@/modules/assistant/application/use-cases/ask-assistant.use-case";
import { AskByVoiceUseCase } from "@/modules/assistant/application/use-cases/ask-by-voice.use-case";
import {
  cleanTranscript,
  isSilentWav,
  parseVoiceAudio,
} from "@/modules/assistant/domain/voice-audio";
import { GeminiLlmAdapter } from "@/modules/assistant/infrastructure/llm/gemini-llm.adapter";
import type { MySettingsUseCase } from "@/modules/identity/application/use-cases/my-settings.use-case";
import { DEFAULT_SETTINGS } from "@/modules/identity/domain/user-settings";

const user: AuthenticatedUser = {
  id: "u1",
  deviceId: "d1",
  name: "Stanley",
  email: "owner@example.com",
};
const AUDIO = Buffer.alloc(4_000, 7).toString("base64");

const codeOf = (error: unknown) =>
  error instanceof AppException
    ? (error.getResponse() as { code: string }).code
    : undefined;

function setup(transcribe: jest.Mock) {
  const ask = {
    execute: jest.fn().mockResolvedValue({ answer: { text: "ok" } }),
  };
  const settings = {
    forUser: () => Promise.resolve({ ...DEFAULT_SETTINGS, language: "pt-BR" }),
  } as unknown as MySettingsUseCase;
  const useCase = new AskByVoiceUseCase(
    { chat: jest.fn(), transcribe },
    ask as unknown as AskAssistantUseCase,
    settings,
  );
  return { useCase, ask };
}

describe("parseVoiceAudio", () => {
  it("accepts supported recordings and refuses the rest", () => {
    expect(parseVoiceAudio(AUDIO, "audio/wav; codecs=1")).toMatchObject({
      ok: true,
      audio: { mimeType: "audio/wav" },
    });
    expect(
      parseVoiceAudio(`data:audio/wav;base64,${AUDIO}`, "audio/wav"),
    ).toMatchObject({ ok: true });
    expect(parseVoiceAudio(AUDIO, "video/mp4")).toMatchObject({ ok: false });
    expect(parseVoiceAudio("abc", "audio/wav")).toMatchObject({ ok: false });
    expect(parseVoiceAudio("@@@@", "audio/wav")).toMatchObject({ ok: false });
    expect(
      parseVoiceAudio(Buffer.alloc(2_100_000).toString("base64"), "audio/wav"),
    ).toMatchObject({ ok: false });
  });
});

/** 16-bit mono PCM WAV with the given samples. */
function wav(samples: number[]): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((sample, i) => data.writeInt16LE(sample, i * 2));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(16000, 24);
  header.writeUInt32LE(32000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

describe("silence and the no-speech mark", () => {
  it("tells silence from speech in a PCM WAV", () => {
    expect(isSilentWav(wav(new Array(8000).fill(12)))).toBe(true);
    const tone = Array.from({ length: 8000 }, (_, i) =>
      Math.round(6000 * Math.sin(i / 5)),
    );
    expect(isSilentWav(wav(tone))).toBe(false);
    expect(isSilentWav(Buffer.from("not a wav file at all, just text."))).toBe(
      false,
    );
  });

  it("turns the no-speech mark into an empty transcript", () => {
    expect(cleanTranscript(" [no-speech] ")).toBe("");
    expect(cleanTranscript(" Bom dia ")).toBe("Bom dia");
  });

  it("refuses a silent recording without calling the model", async () => {
    const transcribe = jest.fn();
    const { useCase } = setup(transcribe);
    const silent = wav(new Array(8000).fill(0)).toString("base64");
    expect(
      codeOf(
        await useCase
          .execute(user, { audioBase64: silent, mimeType: "audio/wav" })
          .catch((e) => e),
      ),
    ).toBe("ASSISTANT_NO_SPEECH");
    expect(transcribe).not.toHaveBeenCalled();
  });

  it("treats the mark from the model as silence", async () => {
    const { useCase, ask } = setup(jest.fn().mockResolvedValue("[no-speech]"));
    expect(
      codeOf(
        await useCase
          .execute(user, { audioBase64: AUDIO, mimeType: "audio/ogg" })
          .catch((e) => e),
      ),
    ).toBe("ASSISTANT_NO_SPEECH");
    expect(ask.execute).not.toHaveBeenCalled();
  });
});

describe("AskByVoiceUseCase", () => {
  it("transcribes in the owner's language and asks the transcript", async () => {
    const transcribe = jest.fn().mockResolvedValue("Qual o clima agora?");
    const { useCase, ask } = setup(transcribe);
    await useCase.execute(user, {
      audioBase64: AUDIO,
      mimeType: "audio/wav",
      conversationId: "c1",
    });
    expect(transcribe).toHaveBeenCalledWith(
      { base64: AUDIO, mimeType: "audio/wav" },
      "pt-BR",
      ["Otto"],
    );
    expect(ask.execute).toHaveBeenCalledWith(user, {
      text: "Qual o clima agora?",
      conversationId: "c1",
    });
  });

  it("explains silence, bad audio and an unavailable model", async () => {
    const silent = setup(jest.fn().mockResolvedValue(""));
    expect(
      codeOf(
        await silent.useCase
          .execute(user, { audioBase64: AUDIO, mimeType: "audio/wav" })
          .catch((e) => e),
      ),
    ).toBe("ASSISTANT_NO_SPEECH");
    expect(silent.ask.execute).not.toHaveBeenCalled();

    expect(
      codeOf(
        await silent.useCase
          .execute(user, { audioBase64: AUDIO, mimeType: "text/plain" })
          .catch((e) => e),
      ),
    ).toBe("ASSISTANT_INVALID_AUDIO");

    const quota = setup(
      jest.fn().mockRejectedValue(new LlmError("QUOTA", "429")),
    );
    expect(
      codeOf(
        await quota.useCase
          .execute(user, { audioBase64: AUDIO, mimeType: "audio/wav" })
          .catch((e) => e),
      ),
    ).toBe("ASSISTANT_QUOTA_EXCEEDED");
  });
});

describe("GeminiLlmAdapter.transcribe", () => {
  afterEach(() => jest.restoreAllMocks());

  const config = {
    get: (key: string) => (key === "GEMINI_API_KEY" ? "k" : "gemini-test"),
  } as unknown as ConfigService;
  const reply = (body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

  it("sends the audio inline and returns the text", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation(() =>
      reply({
        candidates: [
          { content: { role: "model", parts: [{ text: " Bom dia, Otto. " }] } },
        ],
      }),
    );
    const text = await new GeminiLlmAdapter(config).transcribe(
      { base64: AUDIO, mimeType: "audio/wav" },
      "pt-BR",
    );
    expect(text).toBe("Bom dia, Otto.");
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.contents[0].parts[0].inlineData).toEqual({
      mimeType: "audio/wav",
      data: AUDIO,
    });
    expect(body.tools).toBeUndefined();
  });

  it("returns empty when the model hears nothing", async () => {
    jest
      .spyOn(global, "fetch")
      .mockImplementation(() =>
        reply({ candidates: [{ finishReason: "STOP" }] }),
      );
    await expect(
      new GeminiLlmAdapter(config).transcribe(
        { base64: AUDIO, mimeType: "audio/wav" },
        "pt-BR",
      ),
    ).resolves.toBe("");
  });
});
