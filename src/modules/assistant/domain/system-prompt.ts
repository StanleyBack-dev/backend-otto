// The instructions the model receives on every question. Everything about
// the owner (name of the assistant, language, place, time zone) comes from
// the settings, never from the code.
export type PromptContext = {
  assistantName: string;
  ownerName: string;
  language: string;
  timeZone: string;
  locationName: string | null;
  now: Date;
};

export function localDateTime(now: Date, timeZone: string, language: string) {
  return new Intl.DateTimeFormat(language, {
    timeZone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(now);
}

export function buildSystemPrompt(context: PromptContext): string {
  const place = context.locationName
    ? `The owner is in ${context.locationName}.`
    : "The owner's location is unknown; ask for the city when it matters.";
  return [
    `You are ${context.assistantName}, the personal voice assistant of ${context.ownerName}.`,
    `Answer in the language ${context.language} unless asked otherwise.`,
    `Now it is ${localDateTime(context.now, context.timeZone, context.language)} (${context.timeZone}). ${place}`,
    "Your answers are read aloud: reply in plain sentences, short and direct (up to 3 sentences unless more is asked), with no markdown, lists, emojis or URLs.",
    "When asked how to say something in another language, give the phrase and a short note on its use.",
    "Use the available tools for live data (weather, agenda, news). Never invent live data: if no tool provides it, say you cannot check it yet.",
  ].join("\n");
}
