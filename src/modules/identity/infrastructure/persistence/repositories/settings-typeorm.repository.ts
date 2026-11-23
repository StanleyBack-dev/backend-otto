import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import type { SettingsRepositoryPort } from "@/modules/identity/application/ports/settings-repository.port";
import type { UserSettings } from "@/modules/identity/domain/user-settings";
import { UserSettingsOrmEntity } from "@/modules/identity/infrastructure/persistence/entities/user-settings.orm-entity";

@Injectable()
export class SettingsTypeormRepository implements SettingsRepositoryPort {
  constructor(
    @InjectRepository(UserSettingsOrmEntity)
    private readonly settings: Repository<UserSettingsOrmEntity>,
  ) {}

  async find(userId: string): Promise<UserSettings | null> {
    const row = await this.settings.findOneBy({ userId });
    if (!row) return null;
    const hasLocation =
      row.latitude !== null &&
      row.longitude !== null &&
      row.locationUpdatedAt !== null;
    return {
      assistantName: row.assistantName,
      language: row.language,
      timeZone: row.timeZone,
      location: hasLocation
        ? {
            name: row.locationName,
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
            updatedAt: row.locationUpdatedAt as Date,
          }
        : null,
      speechRate: Number(row.speechRate),
      autoSpeak: row.autoSpeak,
      wakeWordEnabled: row.wakeWordEnabled,
    };
  }

  async save(userId: string, settings: UserSettings): Promise<void> {
    await this.settings.upsert(
      {
        userId,
        assistantName: settings.assistantName,
        language: settings.language,
        timeZone: settings.timeZone,
        locationName: settings.location?.name ?? null,
        latitude: settings.location?.latitude.toString() ?? null,
        longitude: settings.location?.longitude.toString() ?? null,
        locationUpdatedAt: settings.location?.updatedAt ?? null,
        speechRate: settings.speechRate.toString(),
        autoSpeak: settings.autoSpeak,
        wakeWordEnabled: settings.wakeWordEnabled,
      },
      ["userId"],
    );
  }
}
