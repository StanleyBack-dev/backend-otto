import type { CalendarEvent } from "@/modules/agenda/domain/agenda";

export class CalendarProviderError extends Error {
  constructor(
    readonly reason: "NOT_CONFIGURED" | "UNAUTHORIZED" | "UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "CalendarProviderError";
  }
}

// The owner's calendars (Google Calendar through the Apps Script endpoint
// today). Throws CalendarProviderError when it cannot answer.
export interface CalendarProviderPort {
  /** Events overlapping [from, to), oldest first. */
  events(from: Date, to: Date): Promise<CalendarEvent[]>;
}

export const CALENDAR_PROVIDER = Symbol("CALENDAR_PROVIDER");
