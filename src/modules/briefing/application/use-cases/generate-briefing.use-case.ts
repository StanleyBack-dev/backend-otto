import { Inject, Injectable, Logger } from "@nestjs/common";
import { redact } from "@/common/logging/redact";
import { GetAgendaUseCase } from "@/modules/agenda/application/use-cases/get-agenda.use-case";
import {
  LLM,
  type LlmPort,
} from "@/modules/assistant/application/ports/llm.port";
import {
  BRIEFING_REPOSITORY,
  type BriefingRepositoryPort,
} from "@/modules/briefing/application/ports/briefing-repository.port";
import {
  briefingSystemPrompt,
  fallbackBriefing,
  MAX_HEADLINES,
  type Briefing,
  type BriefingSections,
} from "@/modules/briefing/domain/briefing";
import { ActiveUsersUseCase } from "@/modules/identity/application/use-cases/active-users.use-case";
import { MySettingsUseCase } from "@/modules/identity/application/use-cases/my-settings.use-case";
import type { UserSettings } from "@/modules/identity/domain/user-settings";
import { GetNewsUseCase } from "@/modules/news/application/use-cases/get-news.use-case";
import { GetWeatherUseCase } from "@/modules/weather/application/use-cases/get-weather.use-case";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";
import { localDate, localTime } from "@/shared/domain/local-time";

// Builds the briefing of the owner's current local date: reads the agenda,
// the weather and yesterday's news (each may fail on its own), then asks
// the AI model to write it. Without the model, a plain template is used.
@Injectable()
export class GenerateBriefingUseCase {
  private readonly logger = new Logger(GenerateBriefingUseCase.name);

  constructor(
    @Inject(BRIEFING_REPOSITORY)
    private readonly briefings: BriefingRepositoryPort,
    @Inject(LLM) private readonly llm: LlmPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly settings: MySettingsUseCase,
    private readonly users: ActiveUsersUseCase,
    private readonly agenda: GetAgendaUseCase,
    private readonly weather: GetWeatherUseCase,
    private readonly news: GetNewsUseCase,
  ) {}

  /** Today's briefing, generating it when it does not exist yet. */
  async today(userId: string): Promise<Briefing> {
    const settings = await this.settings.forUser(userId);
    const date = localDate(this.clock.now(), settings.timeZone);
    return (
      (await this.briefings.findByDate(userId, date)) ??
      this.generate(userId, settings)
    );
  }

  async generate(userId: string, known?: UserSettings): Promise<Briefing> {
    const settings = known ?? (await this.settings.forUser(userId));
    const now = this.clock.now();
    const { timeZone } = settings;
    const ownerName = await this.users.name(userId);
    const sections = await this.sections(userId, settings, now);

    let text: string | null = null;
    try {
      const answer = await this.llm.chat({
        system: briefingSystemPrompt({
          assistantName: settings.assistantName,
          ownerName,
          language: settings.language,
          localDateTime: `${localDate(now, timeZone)} ${localTime(now, timeZone)} (${timeZone})`,
        }),
        turns: [{ role: "user", text: JSON.stringify(sections) }],
        tools: [],
        runTool: () => Promise.resolve({}),
        maxToolRounds: 0,
      });
      text = answer.text.trim() || null;
    } catch (error) {
      this.logger.warn(
        `Briefing written without the model: ${redact(String(error))}`,
      );
    }

    return this.briefings.save({
      userId,
      date: localDate(now, timeZone),
      text: text ?? fallbackBriefing(ownerName, sections),
      sections,
      writtenByModel: text !== null,
    });
  }

  private async sections(
    userId: string,
    settings: UserSettings,
    now: Date,
  ): Promise<BriefingSections> {
    const { timeZone } = settings;
    const unavailable: string[] = [];
    const attempt = async <T>(name: string, read: () => Promise<T>) => {
      try {
        return await read();
      } catch (error) {
        this.logger.warn(`Briefing ${name} failed: ${redact(String(error))}`);
        unavailable.push(name);
        return null;
      }
    };

    const [agenda, weather, news] = await Promise.all([
      attempt("agenda", () => this.agenda.execute({ timeZone, now })),
      attempt("weather", () =>
        this.weather.execute({
          saved: settings.location,
          timeZone,
          language: settings.language,
        }),
      ),
      attempt("news", () =>
        this.news.execute(
          { userId, period: "YESTERDAY", timeZone, now },
          { page: 1, limit: MAX_HEADLINES },
        ),
      ),
    ]);

    let weatherSection: BriefingSections["weather"] = null;
    if (weather?.status === "ok") {
      const today = weather.forecast.days[0];
      weatherSection = {
        place: weather.place,
        temperatureC: weather.forecast.current.temperatureC,
        condition: weather.forecast.current.condition,
        minC: today?.minC ?? null,
        maxC: today?.maxC ?? null,
        precipitationChancePercent: today?.precipitationChancePercent ?? null,
      };
    } else if (weather && !unavailable.includes("weather")) {
      unavailable.push("weather");
    }

    return {
      agenda: (agenda?.events ?? []).map((event) => ({
        title: event.title,
        start: event.allDay ? null : localTime(event.start, timeZone),
        end: event.allDay ? null : localTime(event.end, timeZone),
        allDay: event.allDay,
      })),
      weather: weatherSection,
      headlines: (news?.items ?? []).map((item) => ({
        title: item.title,
        source: item.sourceName,
        category: item.category,
      })),
      unavailable,
    };
  }
}
