// The owner's preferences. Nothing here is fixed in the code: the city comes
// from the coordinates a device reports (or that the owner types), so moving
// or travelling only changes this row. The weather and the briefing read the
// last known location instead of asking the device again on every question.
export type UserLocation = {
  name: string | null;
  latitude: number;
  longitude: number;
  updatedAt: Date;
};

export type UserSettings = {
  assistantName: string;
  /** BCP 47 tag used to understand and to speak (pt-BR, en-US…). */
  language: string;
  /** IANA time zone; follows the location when a device reports it. */
  timeZone: string;
  location: UserLocation | null;
  /** Speech speed multiplier (1 = normal). */
  speechRate: number;
  /** Reads the answers aloud without being asked. */
  autoSpeak: boolean;
  /** The desktop app listens for the assistant's name. */
  wakeWordEnabled: boolean;
  /** Prepares the morning briefing every day. */
  briefingEnabled: boolean;
  /** Local time (HH:mm) the briefing should be ready by. */
  briefingTime: string;
};

export const DEFAULT_SETTINGS: UserSettings = {
  assistantName: "Otto",
  language: "pt-BR",
  timeZone: "America/Sao_Paulo",
  location: null,
  speechRate: 1,
  autoSpeak: true,
  wakeWordEnabled: true,
  briefingEnabled: true,
  briefingTime: "07:00",
};

export type SettingsChange = Partial<
  Pick<
    UserSettings,
    | "assistantName"
    | "language"
    | "timeZone"
    | "speechRate"
    | "autoSpeak"
    | "wakeWordEnabled"
    | "briefingEnabled"
    | "briefingTime"
  >
>;

export type LocationChange = {
  latitude: number;
  longitude: number;
  name?: string | null;
  timeZone?: string | null;
};

export class InvalidSettingsError extends Error {}

export function isValidClockTime(value: string): boolean {
  return /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function isValidLanguage(language: string): boolean {
  try {
    return Intl.getCanonicalLocales(language).length === 1;
  } catch {
    return false;
  }
}

/** The settings after a change; throws InvalidSettingsError on bad input. */
export function applySettingsChange(
  current: UserSettings,
  change: SettingsChange,
): UserSettings {
  const next = { ...current };
  if (change.assistantName !== undefined) {
    const name = change.assistantName.trim();
    if (name.length < 2 || name.length > 40) {
      throw new InvalidSettingsError(
        "O nome do assistente deve ter de 2 a 40 caracteres.",
      );
    }
    next.assistantName = name;
  }
  if (change.language !== undefined) {
    if (!isValidLanguage(change.language)) {
      throw new InvalidSettingsError("Idioma inválido.");
    }
    next.language = Intl.getCanonicalLocales(change.language)[0];
  }
  if (change.timeZone !== undefined) {
    if (!isValidTimeZone(change.timeZone)) {
      throw new InvalidSettingsError("Fuso horário inválido.");
    }
    next.timeZone = change.timeZone;
  }
  if (change.speechRate !== undefined) {
    if (change.speechRate < 0.5 || change.speechRate > 2) {
      throw new InvalidSettingsError(
        "A velocidade da voz deve ficar entre 0,5 e 2.",
      );
    }
    next.speechRate = Math.round(change.speechRate * 100) / 100;
  }
  if (change.autoSpeak !== undefined) next.autoSpeak = change.autoSpeak;
  if (change.wakeWordEnabled !== undefined) {
    next.wakeWordEnabled = change.wakeWordEnabled;
  }
  if (change.briefingEnabled !== undefined) {
    next.briefingEnabled = change.briefingEnabled;
  }
  if (change.briefingTime !== undefined) {
    if (!isValidClockTime(change.briefingTime)) {
      throw new InvalidSettingsError(
        "O horário do resumo deve estar no formato HH:mm, ex.: 07:00.",
      );
    }
    next.briefingTime = change.briefingTime;
  }
  return next;
}

/** The settings with a new location (and its time zone, when known). */
export function applyLocationChange(
  current: UserSettings,
  change: LocationChange,
  now: Date,
): UserSettings {
  const { latitude, longitude } = change;
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new InvalidSettingsError("Latitude inválida.");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new InvalidSettingsError("Longitude inválida.");
  }
  if (change.timeZone && !isValidTimeZone(change.timeZone)) {
    throw new InvalidSettingsError("Fuso horário inválido.");
  }
  const name = change.name?.trim().slice(0, 120) || null;
  return {
    ...current,
    timeZone: change.timeZone || current.timeZone,
    location: {
      name,
      // ~11 cm precision is plenty for weather and keeps the row small.
      latitude: Math.round(latitude * 1e6) / 1e6,
      longitude: Math.round(longitude * 1e6) / 1e6,
      updatedAt: now,
    },
  };
}
