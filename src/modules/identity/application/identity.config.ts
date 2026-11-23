import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { LockoutConfig } from "@/modules/identity/domain/lockout-policy";

// The identity settings read from the environment, in one typed place.
@Injectable()
export class IdentityConfig {
  readonly refreshTokenTtlDays: number;
  readonly lockout: LockoutConfig;

  constructor(config: ConfigService) {
    this.refreshTokenTtlDays = config.get<number>("REFRESH_TOKEN_TTL_DAYS", 90);
    this.lockout = {
      maxAttempts: config.get<number>("AUTH_MAX_FAILED_ATTEMPTS", 5),
      lockMinutes: config.get<number>("AUTH_LOCK_MINUTES", 15),
    };
  }
}
