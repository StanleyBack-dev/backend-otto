import { Injectable } from "@nestjs/common";
import { CalendarProviderError } from "@/modules/agenda/application/ports/calendar-provider.port";
import { GetAgendaUseCase } from "@/modules/agenda/application/use-cases/get-agenda.use-case";
import {
  isHappening,
  MAX_AGENDA_DAYS,
  nextEvent,
} from "@/modules/agenda/domain/agenda";
import type {
  AssistantTool,
  ToolContext,
} from "@/modules/assistant/domain/assistant-tool";
import { localDate, localTime } from "@/shared/domain/local-time";

// "O que eu tenho hoje?", "Qual o próximo compromisso?", "O que estudo
// depois do almoço?", "E amanhã?"
@Injectable()
export class AgendaTool implements AssistantTool {
  readonly name = "get_agenda";
  readonly description =
    "The owner's calendar events (study routine, appointments) with local times. Use it for questions about the day, schedule, what is next, what to study, free time. Also returns what is happening now and the next event.";
  readonly parameters = {
    type: "object" as const,
    properties: {
      date: {
        type: "string" as const,
        description:
          "First day as YYYY-MM-DD in the owner's time zone. Omit for today.",
      },
      days: {
        type: "integer" as const,
        description: `How many days from that date (1-${MAX_AGENDA_DAYS}). Default 1.`,
      },
    },
  };

  constructor(private readonly agenda: GetAgendaUseCase) {}

  async execute(
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<Record<string, unknown>> {
    const { timeZone, now } = context;
    try {
      const agenda = await this.agenda.execute({
        date: typeof args.date === "string" ? args.date : null,
        days: typeof args.days === "number" ? args.days : null,
        timeZone,
        now,
      });
      const next = nextEvent(agenda.events, now);
      return {
        timeZone,
        now: `${localDate(now, timeZone)} ${localTime(now, timeZone)}`,
        from: agenda.from,
        to: agenda.to,
        happeningNow: agenda.events
          .filter((event) => !event.allDay && isHappening(event, now))
          .map((event) => event.title),
        next: next
          ? {
              title: next.title,
              date: localDate(next.start, timeZone),
              start: localTime(next.start, timeZone),
            }
          : null,
        events: agenda.events.map((event) => ({
          title: event.title,
          date: localDate(event.start, timeZone),
          start: event.allDay ? null : localTime(event.start, timeZone),
          end: event.allDay ? null : localTime(event.end, timeZone),
          allDay: event.allDay,
          calendar: event.calendar,
          location: event.location,
          // Enough for the gist; long descriptions only slow the model down.
          description: event.description?.slice(0, 200) ?? null,
        })),
      };
    } catch (error) {
      if (
        error instanceof CalendarProviderError &&
        error.reason === "NOT_CONFIGURED"
      ) {
        return { error: "The calendar is not connected to Otto yet." };
      }
      throw error;
    }
  }
}
