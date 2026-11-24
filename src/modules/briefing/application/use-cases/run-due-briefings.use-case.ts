import { Inject, Injectable, Logger } from "@nestjs/common";
import { redact } from "@/common/logging/redact";
import { reportSystemEvent } from "@/common/logging/system-events";
import {
  BRIEFING_REPOSITORY,
  type BriefingRepositoryPort,
} from "@/modules/briefing/application/ports/briefing-repository.port";
import { GenerateBriefingUseCase } from "@/modules/briefing/application/use-cases/generate-briefing.use-case";
import {
  BRIEFING_RETENTION_DAYS,
  isBriefingDue,
} from "@/modules/briefing/domain/briefing";
import { ActiveUsersUseCase } from "@/modules/identity/application/use-cases/active-users.use-case";
import { MySettingsUseCase } from "@/modules/identity/application/use-cases/my-settings.use-case";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";
import { addDays, localDate, localTime } from "@/shared/domain/local-time";

export type RunResult = { checked: number; generated: number; failed: number };

// Called hourly by the Routines workflow: prepares today's briefing for
// every owner whose briefing time is within the next hour (or passed), in
// their own time zone, once per local date.
@Injectable()
export class RunDueBriefingsUseCase {
  private readonly logger = new Logger(RunDueBriefingsUseCase.name);

  constructor(
    @Inject(BRIEFING_REPOSITORY)
    private readonly briefings: BriefingRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly users: ActiveUsersUseCase,
    private readonly settings: MySettingsUseCase,
    private readonly generator: GenerateBriefingUseCase,
  ) {}

  async run(): Promise<RunResult> {
    const result: RunResult = { checked: 0, generated: 0, failed: 0 };
    for (const userId of await this.users.ids()) {
      result.checked++;
      const settings = await this.settings.forUser(userId);
      const now = this.clock.now();
      const date = localDate(now, settings.timeZone);
      if (!isBriefingDue(settings, localTime(now, settings.timeZone))) continue;
      if (await this.briefings.findByDate(userId, date)) continue;
      try {
        await this.generator.generate(userId, settings);
        result.generated++;
      } catch (error) {
        result.failed++;
        const message = redact(String(error)).slice(0, 300);
        this.logger.error(`Briefing failed: ${message}`);
        reportSystemEvent({
          level: "ERROR",
          category: "ROUTINE",
          source: "Morning briefing",
          message,
        });
      }
    }
    return result;
  }

  /** Daily cleanup: briefings older than the retention. */
  purgeOld(): Promise<number> {
    const today = localDate(this.clock.now(), "UTC");
    return this.briefings.purgeBefore(addDays(today, -BRIEFING_RETENTION_DAYS));
  }
}
