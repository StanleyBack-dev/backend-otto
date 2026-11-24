// A spoken question: a short recording sent as base64. The formats are the
// ones the AI model understands; the size keeps a request well under the
// 4.5 MB Vercel body limit (about 60 s of 16 kHz mono WAV).
export const AUDIO_TYPES = [
  "audio/wav",
  "audio/ogg",
  "audio/mp3",
  "audio/mpeg",
  "audio/flac",
  "audio/aac",
] as const;

export type AudioType = (typeof AUDIO_TYPES)[number];

export const MAX_AUDIO_BYTES = 2_000_000;
/** Shorter than this is a click, not speech. */
export const MIN_AUDIO_BYTES = 1_000;

export type VoiceAudio = { base64: string; mimeType: AudioType };

/** The recording, or the reason it cannot be used. */
export function parseVoiceAudio(
  base64: string,
  mimeType: string,
): { ok: true; audio: VoiceAudio } | { ok: false; reason: string } {
  const type = mimeType.toLowerCase().split(";")[0].trim();
  if (!(AUDIO_TYPES as readonly string[]).includes(type)) {
    return { ok: false, reason: `Formato de áudio não suportado (${type}).` };
  }
  const data = base64.replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
    return { ok: false, reason: "Áudio inválido." };
  }
  const bytes = Math.floor((data.length * 3) / 4);
  if (bytes < MIN_AUDIO_BYTES) {
    return { ok: false, reason: "Não ouvi nada. Fale de novo." };
  }
  if (bytes > MAX_AUDIO_BYTES) {
    return {
      ok: false,
      reason: "O áudio ficou longo demais. Fale de novo, mais curto.",
    };
  }
  return { ok: true, audio: { base64: data, mimeType: type as AudioType } };
}

/** Below this loudness (RMS of 16-bit samples) a recording is silence. */
const SILENCE_RMS = 200;

/**
 * Whether a 16-bit PCM WAV holds only silence. Checked before calling the
 * model, which may "hear" words in silence (and to save its quota). Other
 * formats return false: the model decides.
 */
export function isSilentWav(audio: Buffer): boolean {
  if (
    audio.length < 44 ||
    audio.toString("ascii", 0, 4) !== "RIFF" ||
    audio.toString("ascii", 8, 12) !== "WAVE"
  ) {
    return false;
  }
  // Walk the chunks to the format and the samples.
  let offset = 12;
  let bitsPerSample = 0;
  let format = 0;
  while (offset + 8 <= audio.length) {
    const id = audio.toString("ascii", offset, offset + 4);
    const size = audio.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      format = audio.readUInt16LE(body);
      bitsPerSample = audio.readUInt16LE(body + 14);
    } else if (id === "data") {
      if (format !== 1 || bitsPerSample !== 16) return false;
      const end = Math.min(audio.length, body + size) - 1;
      let sum = 0;
      let count = 0;
      for (let i = body; i < end; i += 2) {
        const sample = audio.readInt16LE(i);
        sum += sample * sample;
        count++;
      }
      return count === 0 || Math.sqrt(sum / count) < SILENCE_RMS;
    }
    offset = body + size + (size % 2);
  }
  return false;
}

/** What the model answers when it hears no speech. */
export const NO_SPEECH_MARK = "[no-speech]";

export function cleanTranscript(text: string): string {
  const trimmed = text.trim();
  return trimmed.toLowerCase().includes(NO_SPEECH_MARK) ? "" : trimmed;
}
