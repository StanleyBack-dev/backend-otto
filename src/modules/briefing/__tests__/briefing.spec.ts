import type { GetAgendaUseCase } from "@/modules/agenda/application/use-cases/get-agenda.use-case";
import {
  LlmError,
  type LlmPort,
  type LlmRequest,
} from "@/modules/assistant/application/ports/llm.port";
import type { BriefingRepositoryPort } from "@/modules/briefing/application/ports/briefing-repository.port";
import { GenerateBriefingUseCase } from "@/modules/briefing/application/use-cases/generate-briefing.use-case";
import { RunDueBriefingsUseCase } from "@/modules/briefing/application/use-cases/run-due-briefings.use-case";
import {
  fallbackBriefing,
  isBriefingDue,
  type Briefing,
} from "@/modules/briefing/domain/briefing";
import type { ActiveUsersUseCase } from "@/modules/identity/application/use-cases/active-users.use-case";
import type { MySettingsUseCase } from "@/modules/identity/application/use-cases/my-settings.use-case";
import {
  DEFAULT_SETTINGS,
  type UserSettings,
} from "@/modules/identity/domain/user-settings";
import type { GetNewsUseCase } from "@/modules/news/application/use-cases/get-news.use-case";
import type { GetWeatherUseCase } from "@/modules/weather/application/use-cases/get-weather.use-case";

// 2026-11-24 06:10 in Brasília.
const NOW = new Date("2026-11-24T09:10:00Z");

const SETTINGS: UserSettings = {
  ...DEFAULT_SETTINGS,
  location: {
    name: "Goiânia - GO",
    latitude: -16.69,
    longitude: -49.26,
    updatedAt: NOW,
  },
};

class InMemoryBriefings implements BriefingRepositoryPort {
  saved: Briefing[] = [];
  findByDate = (userId: string, date: string) =>
    Promise.resolve(
      this.saved.find((b) => b.userId === userId && b.date === date) ?? null,
    );
  save(briefing: Omit<Briefing, "id" | "createdAt">) {
    this.saved = this.saved.filter(
      (b) => !(b.userId === briefing.userId && b.date === briefing.date),
    );
    const stored = {
      ...briefing,
      id: `b${this.saved.length + 1}`,
      createdAt: NOW,
    };
    this.saved.push(stored);
    return Promise.resolve(stored);
  }
  page = () => Promise.reject(new Error("unused"));
  purgeBefore = () => Promise.resolve(0);
}

function setup(options: {
  llm?: LlmPort["chat"];
  agendaFails?: boolean;
  settings?: Record<string, UserSettings>;
}) {
  const briefings = new InMemoryBriefings();
  const chat = jest.fn(
    options.llm ??
      (() => Promise.resolve({ text: "Bom dia, Stanley!", toolsUsed: [] })),
  );
  const clock = { now: () => NOW };
  const settings = {
    forUser: (id: string) =>
      Promise.resolve(options.settings?.[id] ?? SETTINGS),
  } as unknown as MySettingsUseCase;
  const users = {
    ids: () =>
      Promise.resolve(Object.keys(options.settings ?? { u1: SETTINGS })),
    name: () => Promise.resolve("Stanley Rodrigues"),
  } as unknown as ActiveUsersUseCase;
  const agenda = {
    execute: options.agendaFails
      ? () => Promise.reject(new Error("not connected"))
      : () =>
          Promise.resolve({
            from: "2026-11-24",
            to: "2026-11-24",
            timeZone: "America/Sao_Paulo",
            events: [
              {
                id: "e1",
                title: "Programação: NestJS",
                start: new Date("2026-11-24T11:15:00Z"),
                end: new Date("2026-11-24T13:00:00Z"),
                allDay: false,
                location: null,
                description: null,
                calendar: "Rotina de Estudos",
              },
            ],
          }),
  } as unknown as GetAgendaUseCase;
  const weather = {
    execute: () =>
      Promise.resolve({
        status: "ok",
        place: "Goiânia - GO",
        forecast: {
          timeZone: "America/Sao_Paulo",
          current: { temperatureC: 21.4, condition: "light drizzle" },
          days: [{ minC: 19, maxC: 29.6, precipitationChancePercent: 80 }],
        },
      }),
  } as unknown as GetWeatherUseCase;
  const news = {
    execute: jest.fn().mockResolvedValue({
      items: [
        { title: "Manchete de ontem", sourceName: "g1", category: "geral" },
      ],
    }),
  } as unknown as GetNewsUseCase;
  const generator = new GenerateBriefingUseCase(
    briefings,
    { chat, transcribe: jest.fn() },
    clock,
    settings,
    users,
    agenda,
    weather,
    news,
  );
  return {
    briefings,
    chat,
    news,
    generator,
    runner: new RunDueBriefingsUseCase(
      briefings,
      clock,
      users,
      settings,
      generator,
    ),
  };
}

describe("briefing domain", () => {
  it("is due from one hour before the chosen time", () => {
    const on = { briefingEnabled: true, briefingTime: "07:00" };
    expect(isBriefingDue(on, "05:59")).toBe(false);
    expect(isBriefingDue(on, "06:00")).toBe(true);
    expect(isBriefingDue(on, "15:00")).toBe(true);
    expect(isBriefingDue({ ...on, briefingEnabled: false }, "07:00")).toBe(
      false,
    );
  });

  it("has a spoken fallback without the model", () => {
    const text = fallbackBriefing("Stanley Rodrigues", {
      agenda: [
        { title: "Academia", start: "16:00", end: "17:30", allDay: false },
      ],
      weather: {
        place: "Goiânia - GO",
        temperatureC: 21.4,
        condition: "rain",
        minC: 19,
        maxC: 29.6,
        precipitationChancePercent: 80,
      },
      headlines: [{ title: "Manchete", source: "g1", category: "geral" }],
      unavailable: [],
    });
    expect(text).toContain("Bom dia, Stanley.");
    expect(text).toContain("faz 21 graus");
    expect(text).toContain("80% de chance de chuva");
    expect(text).toContain("16:00 Academia");
    expect(text).toContain("Manchete");
  });
});

describe("GenerateBriefingUseCase", () => {
  it("gathers the sections, asks the model and stores today's briefing", async () => {
    const t = setup({});
    const briefing = await t.generator.today("u1");
    expect(briefing).toMatchObject({
      date: "2026-11-24",
      text: "Bom dia, Stanley!",
      writtenByModel: true,
    });
    const request = t.chat.mock.calls[0][0] as LlmRequest;
    const data = JSON.parse(request.turns[0].text);
    expect(data.agenda[0]).toEqual({
      title: "Programação: NestJS",
      start: "08:15",
      end: "10:00",
      allDay: false,
    });
    expect(data.weather.place).toBe("Goiânia - GO");
    expect(request.tools).toEqual([]);
    expect(t.news.execute).toHaveBeenCalledWith(
      expect.objectContaining({ period: "YESTERDAY" }),
      expect.anything(),
    );
    // Asked again the same day: the stored one, no new model call.
    await t.generator.today("u1");
    expect(t.chat).toHaveBeenCalledTimes(1);
  });

  it("keeps going when a source fails and when the model is down", async () => {
    const t = setup({
      agendaFails: true,
      llm: () => Promise.reject(new LlmError("QUOTA", "429")),
    });
    const briefing = await t.generator.generate("u1");
    expect(briefing.writtenByModel).toBe(false);
    expect(briefing.sections.unavailable).toEqual(["agenda"]);
    expect(briefing.text).toContain("Bom dia, Stanley.");
  });
});

describe("RunDueBriefingsUseCase", () => {
  it("prepares only the due briefings, once per local date", async () => {
    const t = setup({
      settings: {
        early: { ...SETTINGS, briefingTime: "07:00" },
        late: { ...SETTINGS, briefingTime: "09:00" },
        off: { ...SETTINGS, briefingEnabled: false },
        lisbon: {
          ...SETTINGS,
          timeZone: "Europe/Lisbon",
          briefingTime: "09:00",
        },
      },
    });
    expect(await t.runner.run()).toEqual({
      checked: 4,
      generated: 2,
      failed: 0,
    });
    expect(t.briefings.saved.map((b) => b.userId).sort()).toEqual([
      "early",
      "lisbon",
    ]);
    expect(await t.runner.run()).toEqual({
      checked: 4,
      generated: 0,
      failed: 0,
    });
  });
});
