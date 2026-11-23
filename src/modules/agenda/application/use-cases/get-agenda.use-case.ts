import { Inject, Injectable } from "@nestjs/common";
import {
  CALENDAR_PROVIDER,
  type CalendarProviderPort,
} from "@/modules/agenda/application/ports/calendar-provider.port";
import {
  clampAgendaDays,
  type CalendarEvent,
} from "@/modules/agenda/domain/agenda";
import {
  addDays,
  isLocalDate,
  localDate,
  startOfLocalDate,
} from "@/shared/domain/local-time";

export type AgendaRequest = {
  /** First day (YYYY-MM-DD); today in `timeZone` when absent or invalid. */
  date?: string | null;
  days?: number | null;
  timeZone: string;
  now: Date;
};

export type Agenda = {
  from: string;
  to: string;
  timeZone: string;
  events: CalendarEvent[];
};

// The commitments of one or more days in the owner's time zone. Results are
// cached briefly: the desktop app and the assistant may ask several times
// in a row and the Apps Script endpoint takes a second or two.
@Injectable()
export class GetAgendaUseCase {
  private static readonly CACHE_MS = 2 * 60_000;
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: CalendarEvent[] }
  >();

  constructor(
    @Inject(CALENDAR_PROVIDER) private readonly calendar: CalendarProviderPort,
  ) {}

  async execute(request: AgendaRequest): Promise<Agenda> {
    const first =
      request.date && isLocalDate(request.date)
        ? request.date
        : localDate(request.now, request.timeZone);
    const days = clampAgendaDays(request.days);
    const last = addDays(first, days - 1);
    const from = startOfLocalDate(first, request.timeZone);
    const to = startOfLocalDate(addDays(first, days), request.timeZone);
    return {
      from: first,
      to: last,
      timeZone: request.timeZone,
      events: await this.events(from, to),
    };
  }

  private async events(from: Date, to: Date): Promise<CalendarEvent[]> {
    const key = `${from.toISOString()}|${to.toISOString()}`;
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > now) return hit.value;
    const value = await this.calendar.events(from, to);
    if (this.cache.size > 50) this.cache.clear();
    this.cache.set(key, { expiresAt: now + GetAgendaUseCase.CACHE_MS, value });
    return value;
  }
}
