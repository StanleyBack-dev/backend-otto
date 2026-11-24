// The morning briefing: the day's agenda, the weather and yesterday's
// headlines, written by the AI model to be read aloud. One per owner and
// local date.
export type BriefingSections = {
  agenda: {
    title: string;
    start: string | null;
    end: string | null;
    allDay: boolean;
  }[];
  weather: {
    place: string;
    temperatureC: number;
    condition: string;
    minC: number | null;
    maxC: number | null;
    precipitationChancePercent: number | null;
  } | null;
  headlines: { title: string; source: string; category: string }[];
  /** Sections that could not be read (e.g. "agenda", "weather", "news"). */
  unavailable: string[];
};

export type Briefing = {
  id: string;
  userId: string;
  /** Local date (YYYY-MM-DD) in the owner's time zone. */
  date: string;
  text: string;
  sections: BriefingSections;
  /** false: the model was unavailable and a plain template was used. */
  writtenByModel: boolean;
  createdAt: Date;
};

export const BRIEFING_RETENTION_DAYS = 30;
/** The routine prepares the briefing up to this long before its time. */
export const PREPARE_AHEAD_MINUTES = 60;
export const MAX_HEADLINES = 10;

const minutesOf = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/** Whether the routine should prepare today's briefing at `localTime`. */
export function isBriefingDue(
  settings: { briefingEnabled: boolean; briefingTime: string },
  localTime: string,
): boolean {
  return (
    settings.briefingEnabled &&
    minutesOf(localTime) >=
      minutesOf(settings.briefingTime) - PREPARE_AHEAD_MINUTES
  );
}

/**
 * A plain briefing in Portuguese for when the AI model is unavailable: the
 * owner still hears the essentials.
 */
export function fallbackBriefing(
  ownerName: string,
  sections: BriefingSections,
): string {
  const parts = [`Bom dia${ownerName ? `, ${ownerName.split(" ")[0]}` : ""}.`];
  const w = sections.weather;
  if (w) {
    const range =
      w.minC !== null && w.maxC !== null
        ? `, com mínima de ${Math.round(w.minC)} e máxima de ${Math.round(w.maxC)} graus`
        : "";
    const rain =
      w.precipitationChancePercent !== null &&
      w.precipitationChancePercent >= 50
        ? ` e ${Math.round(w.precipitationChancePercent)}% de chance de chuva`
        : "";
    parts.push(
      `Em ${w.place} agora faz ${Math.round(w.temperatureC)} graus${range}${rain}.`,
    );
  }
  const timed = sections.agenda.filter((event) => !event.allDay);
  if (timed.length > 0) {
    const first = timed
      .slice(0, 4)
      .map((event) => `${event.start} ${event.title}`)
      .join("; ");
    parts.push(
      `Você tem ${timed.length} compromisso${timed.length > 1 ? "s" : ""} hoje. Começa com: ${first}.`,
    );
  } else if (!sections.unavailable.includes("agenda")) {
    parts.push("Sua agenda de hoje está livre.");
  }
  if (sections.headlines.length > 0) {
    parts.push(
      `Destaques de ontem: ${sections.headlines
        .slice(0, 3)
        .map((headline) => headline.title)
        .join("; ")}.`,
    );
  }
  return parts.join(" ");
}

export function briefingSystemPrompt(context: {
  assistantName: string;
  ownerName: string;
  language: string;
  localDateTime: string;
}): string {
  return [
    `You are ${context.assistantName}, the personal voice assistant of ${context.ownerName}. Write the morning briefing they will hear.`,
    `Write in the language ${context.language}. Now it is ${context.localDateTime}.`,
    "Use only the JSON data the user sends. Order: a short greeting by first name; the weather now and for the day (mention rain when likely); the day's agenda, grouping it into its main blocks with start times (skip breaks and the summary event itself); then the 3 or 4 most relevant headlines from yesterday, one sentence each.",
    "If a section is listed in `unavailable`, say in a few words that you could not check it. If the agenda is empty, say the day is free.",
    "It is read aloud: plain sentences, no markdown, lists, emojis or URLs, at most about 150 words.",
  ].join("\n");
}
