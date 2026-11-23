import type { UserSettings } from "@/modules/identity/domain/user-settings";

export interface SettingsRepositoryPort {
  /** Null while the user never changed anything (defaults apply). */
  find(userId: string): Promise<UserSettings | null>;
  save(userId: string, settings: UserSettings): Promise<void>;
}

export const SETTINGS_REPOSITORY = Symbol("SETTINGS_REPOSITORY");
