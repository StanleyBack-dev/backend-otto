import { Inject, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import {
  SETTINGS_REPOSITORY,
  type SettingsRepositoryPort,
} from "@/modules/identity/application/ports/settings-repository.port";
import {
  applyLocationChange,
  applySettingsChange,
  DEFAULT_SETTINGS,
  InvalidSettingsError,
  type LocationChange,
  type SettingsChange,
  type UserSettings,
} from "@/modules/identity/domain/user-settings";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

// The preferences and the last known location. Other modules (weather,
// briefing) read them through `forUser`.
@Injectable()
export class MySettingsUseCase {
  constructor(
    @Inject(SETTINGS_REPOSITORY)
    private readonly settings: SettingsRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async forUser(userId: string): Promise<UserSettings> {
    return (await this.settings.find(userId)) ?? DEFAULT_SETTINGS;
  }

  update(
    user: AuthenticatedUser,
    change: SettingsChange,
  ): Promise<UserSettings> {
    return this.save(user.id, (current) =>
      applySettingsChange(current, change),
    );
  }

  /** A device reports where it is (or the owner types a place). */
  updateLocation(
    user: AuthenticatedUser,
    change: LocationChange,
  ): Promise<UserSettings> {
    return this.save(user.id, (current) =>
      applyLocationChange(current, change, this.clock.now()),
    );
  }

  private async save(
    userId: string,
    apply: (current: UserSettings) => UserSettings,
  ): Promise<UserSettings> {
    let next: UserSettings;
    try {
      next = apply(await this.forUser(userId));
    } catch (error) {
      if (error instanceof InvalidSettingsError) {
        throw AppException.from(APP_ERRORS.identity.invalidSettings, {
          reason: error.message,
        });
      }
      throw error;
    }
    await this.settings.save(userId, next);
    return next;
  }
}
