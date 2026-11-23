import type { ConfigService } from "@nestjs/config";
import {
  CalendarProviderError,
  type CalendarProviderPort,
} from "@/modules/agenda/application/ports/calendar-provider.port";
import { AgendaTool } from "@/modules/agenda/application/tools/agenda.tool";
import { GetAgendaUseCase } from "@/modules/agenda/application/use-cases/get-agenda.use-case";
import {
  clampAgendaDays,
  nextEvent,
  type CalendarEvent,
} from "@/modules/agenda/domain/agenda";
import { AppsScriptCalendarAdapter } from "@/modules/agenda/infrastructure/apps-script-calendar.adapter";
import type { ToolContext } from "@/modules/assistant/domain/assistant-tool";

const TZ = "America/Sao_Paulo";
// 2026-11-23 15:00 in Brasília.
const NOW = new Date("2026-11-23T18:00:00Z");

function event(
  title: string,
  start: string,
  end: string,
  allDay = false,
): CalendarEvent {
  return {
    id: title,
    title,
    start: new Date(start),
    end: new Date(end),
    allDay,
    location: null,
    description: null,
    calendar: "Rotina de Estudos",
  };
}

const EVENTS = [
  event("Feriado", "2026-11-23T03:00:00Z", "2026-11-24T03:00:00Z", true),
  event("Inglês", "2026-11-23T17:30:00Z", "2026-11-23T18:30:00Z"),
  event("Academia", "2026-11-23T19:00:00Z", "2026-11-23T20:30:00Z"),
];

function provider(): jest.Mocked<CalendarProviderPort> {
  return { events: jest.fn().mockResolvedValue(EVENTS) };
}

describe("agenda domain", () => {
  it("finds the next timed event and clamps the days", () => {
    expect(nextEvent(EVENTS, NOW)?.title).toBe("Academia");
    expect(nextEvent(EVENTS, new Date("2026-11-24T00:00:00Z"))).toBeNull();
    expect(clampAgendaDays(undefined)).toBe(1);
    expect(clampAgendaDays(20)).toBe(7);
  });
});

describe("GetAgendaUseCase", () => {
  it("asks for whole local days in the owner's time zone and caches", async () => {
    const p = provider();
    const useCase = new GetAgendaUseCase(p);
    const agenda = await useCase.execute({ timeZone: TZ, now: NOW, days: 2 });
    await useCase.execute({ timeZone: TZ, now: NOW, days: 2 });
    expect(agenda).toMatchObject({ from: "2026-11-23", to: "2026-11-24" });
    expect(p.events).toHaveBeenCalledTimes(1);
    expect(p.events).toHaveBeenCalledWith(
      new Date("2026-11-23T03:00:00Z"),
      new Date("2026-11-25T03:00:00Z"),
    );
  });

  it("follows another time zone and ignores an invalid date", async () => {
    const p = provider();
    await new GetAgendaUseCase(p).execute({
      date: "2026-13-40",
      timeZone: "Europe/Lisbon",
      now: NOW,
    });
    expect(p.events).toHaveBeenCalledWith(
      new Date("2026-11-23T00:00:00Z"),
      new Date("2026-11-24T00:00:00Z"),
    );
  });
});

describe("AgendaTool", () => {
  const context: ToolContext = {
    userId: "u1",
    timeZone: TZ,
    language: "pt-BR",
    location: null,
    now: NOW,
  };

  it("gives local times, what is happening and what is next", async () => {
    const tool = new AgendaTool(new GetAgendaUseCase(provider()));
    const result = await tool.execute({}, context);
    expect(result).toMatchObject({
      now: "2026-11-23 15:00",
      happeningNow: ["Inglês"],
      next: { title: "Academia", date: "2026-11-23", start: "16:00" },
    });
    expect((result.events as { start: string | null }[])[1].start).toBe(
      "14:30",
    );
    expect((result.events as { start: string | null }[])[0].start).toBeNull();
  });

  it("tells the model when the calendar is not connected", async () => {
    const p = provider();
    p.events.mockRejectedValue(
      new CalendarProviderError("NOT_CONFIGURED", "no url"),
    );
    const result = await new AgendaTool(new GetAgendaUseCase(p)).execute(
      {},
      context,
    );
    expect(result.error).toContain("not connected");
  });
});

describe("AppsScriptCalendarAdapter", () => {
  afterEach(() => jest.restoreAllMocks());

  const config = (url: string, token: string) =>
    ({
      get: (key: string) =>
        key === "AGENDA_SCRIPT_URL"
          ? url
          : key === "AGENDA_SCRIPT_TOKEN"
            ? token
            : undefined,
    }) as unknown as ConfigService;
  const URL_ = "https://script.google.com/macros/s/abc/exec";
  const TOKEN = "t".repeat(64);
  const reply = (status: number, body: string) =>
    Promise.resolve(new Response(body, { status }));

  it("sends the range and the token and maps the events", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation(() =>
      reply(
        200,
        JSON.stringify({
          events: [
            {
              id: "e1",
              title: "Inglês",
              start: "2026-11-23T17:30:00.000Z",
              end: "2026-11-23T18:30:00.000Z",
              allDay: false,
              location: null,
              description: "Anki",
              calendar: "Rotina de Estudos",
            },
          ],
        }),
      ),
    );
    const events = await new AppsScriptCalendarAdapter(
      config(URL_, TOKEN),
    ).events(
      new Date("2026-11-23T03:00:00Z"),
      new Date("2026-11-24T03:00:00Z"),
    );
    expect(events[0]).toMatchObject({
      title: "Inglês",
      start: new Date("2026-11-23T17:30:00Z"),
    });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("token")).toBe(TOKEN);
    expect(url.searchParams.get("from")).toBe("2026-11-23T03:00:00.000Z");
  });

  it("explains each failure", async () => {
    const from = new Date("2026-11-23T03:00:00Z");
    const to = new Date("2026-11-24T03:00:00Z");
    await expect(
      new AppsScriptCalendarAdapter(config("", "")).events(from, to),
    ).rejects.toMatchObject({ reason: "NOT_CONFIGURED" });

    jest
      .spyOn(global, "fetch")
      .mockImplementationOnce(() =>
        reply(200, JSON.stringify({ error: "unauthorized" })),
      )
      .mockImplementationOnce(() => reply(200, "<html>Sign in</html>"))
      .mockImplementationOnce(() => Promise.reject(new Error("timeout")));
    const adapter = new AppsScriptCalendarAdapter(config(URL_, TOKEN));
    for (const reason of ["UNAUTHORIZED", "UNAVAILABLE", "UNAVAILABLE"]) {
      await expect(adapter.events(from, to)).rejects.toMatchObject({ reason });
    }
  });
});
