// The owner's commitments, read from their calendars.
export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location: string | null;
  description: string | null;
  /** Name of the calendar it belongs to ("Rotina de Estudos"…). */
  calendar: string;
};

export const MAX_AGENDA_DAYS = 7;

export function clampAgendaDays(days: number | null | undefined): number {
  if (!days || !Number.isFinite(days)) return 1;
  return Math.min(MAX_AGENDA_DAYS, Math.max(1, Math.round(days)));
}

/** Happening at `now` (all-day events count for the whole day). */
export function isHappening(event: CalendarEvent, now: Date): boolean {
  return event.start <= now && now < event.end;
}

/** The first timed event that starts after `now`. */
export function nextEvent(
  events: CalendarEvent[],
  now: Date,
): CalendarEvent | null {
  return (
    events
      .filter((event) => !event.allDay && event.start > now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())[0] ?? null
  );
}
