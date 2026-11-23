import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CalendarProviderError,
  type CalendarProviderPort,
} from "@/modules/agenda/application/ports/calendar-provider.port";
import type { CalendarEvent } from "@/modules/agenda/domain/agenda";

const TIMEOUT_MS = 15_000;

type ScriptEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  description: string | null;
  calendar: string;
};

type ScriptResponse = { events?: ScriptEvent[]; error?: string };

// Google Calendar through the owner's Apps Script web app
// (integrations/google-apps-script/otto-agenda.gs). It runs as the owner,
// so there is no Google Cloud OAuth to renew; the token is the credential.
@Injectable()
export class AppsScriptCalendarAdapter implements CalendarProviderPort {
  private readonly url: string;
  private readonly token: string;

  constructor(config: ConfigService) {
    this.url = config.get<string>("AGENDA_SCRIPT_URL") ?? "";
    this.token = config.get<string>("AGENDA_SCRIPT_TOKEN") ?? "";
  }

  async events(from: Date, to: Date): Promise<CalendarEvent[]> {
    if (!this.url || !this.token) {
      throw new CalendarProviderError(
        "NOT_CONFIGURED",
        "AGENDA_SCRIPT_URL / AGENDA_SCRIPT_TOKEN are not set.",
      );
    }
    const params = new URLSearchParams({
      token: this.token,
      from: from.toISOString(),
      to: to.toISOString(),
    });
    let response: Response;
    try {
      // Apps Script answers with a redirect to googleusercontent.com.
      response = await fetch(`${this.url}?${params}`, {
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw new CalendarProviderError(
        "UNAVAILABLE",
        `Apps Script unreachable: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
    const body = (await response
      .json()
      .catch(() => null)) as ScriptResponse | null;
    if (!response.ok || !body) {
      // A login page instead of JSON: the deployment is not public.
      throw new CalendarProviderError(
        "UNAVAILABLE",
        `Apps Script ${response.status}: not a JSON answer (check the web app access).`,
      );
    }
    if (body.error === "unauthorized") {
      throw new CalendarProviderError("UNAUTHORIZED", "Wrong agenda token.");
    }
    if (body.error || !Array.isArray(body.events)) {
      throw new CalendarProviderError(
        "UNAVAILABLE",
        `Apps Script error: ${body.error ?? "no events"}`,
      );
    }
    return body.events.map((event) => ({
      id: event.id,
      title: event.title,
      start: new Date(event.start),
      end: new Date(event.end),
      allDay: event.allDay,
      location: event.location,
      description: event.description,
      calendar: event.calendar,
    }));
  }
}
