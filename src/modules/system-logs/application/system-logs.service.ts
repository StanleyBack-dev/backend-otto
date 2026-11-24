import { Inject, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { redact } from "@/common/logging/redact";
import {
  setSystemEventSink,
  type SystemEvent,
} from "@/common/logging/system-events";
import {
  SYSTEM_LOG_REPOSITORY,
  type SystemLogRepositoryPort,
} from "@/modules/system-logs/application/ports/system-log-repository.port";
import {
  LOG_RETENTION_DAYS,
  clip,
} from "@/modules/system-logs/domain/system-log";

// Stores the system events (unexpected API and database errors, failed
// routines, desktop app errors) in tb_system_logs.
@Injectable()
export class SystemLogsService implements OnModuleInit {
  private readonly logger = new Logger(SystemLogsService.name);
  private readonly environment: string;

  constructor(
    @Inject(SYSTEM_LOG_REPOSITORY)
    private readonly logs: SystemLogRepositoryPort,
    config: ConfigService,
  ) {
    this.environment = clip(
      config.get<string>("VERCEL_ENV") ||
        config.get<string>("NODE_ENV") ||
        "development",
      20,
    );
  }

  onModuleInit(): void {
    setSystemEventSink((event) => void this.record(event));
  }

  async record(event: SystemEvent): Promise<void> {
    try {
      const details = event.details
        ? (JSON.parse(redact(JSON.stringify(event.details))) as Record<
            string,
            unknown
          >)
        : null;
      await this.logs.insert({
        level: event.level,
        category: event.category,
        source: clip(event.source, 200),
        message: clip(redact(event.message), 1000),
        details,
        statusCode: event.statusCode ?? null,
        durationMs:
          event.durationMs == null ? null : Math.round(event.durationMs),
        environment: this.environment,
      });
    } catch (error) {
      // Never loop back into the log: only the console.
      this.logger.error(`System log not stored: ${redact(String(error))}`);
    }
  }

  /** Daily cleanup: logs older than the retention. */
  purgeOld(now: Date): Promise<number> {
    return this.logs.purgeBefore(
      new Date(now.getTime() - LOG_RETENTION_DAYS * 86_400_000),
    );
  }
}
