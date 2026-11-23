import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, MoreThan, Not, type Repository } from "typeorm";
import type { DeviceRepositoryPort } from "@/modules/identity/application/ports/device-repository.port";
import type { Device } from "@/modules/identity/domain/device";
import { DeviceOrmEntity } from "@/modules/identity/infrastructure/persistence/entities/device.orm-entity";

@Injectable()
export class DeviceTypeormRepository implements DeviceRepositoryPort {
  constructor(
    @InjectRepository(DeviceOrmEntity)
    private readonly devices: Repository<DeviceOrmEntity>,
  ) {}

  async create(
    device: Omit<Device, "createdAt" | "lastSeenAt" | "revokedAt">,
    now: Date,
  ): Promise<void> {
    await this.devices.insert({ ...device, lastSeenAt: now, revokedAt: null });
  }

  async findById(id: string): Promise<Device | null> {
    return this.devices.findOneBy({ id });
  }

  listLive(userId: string, now: Date): Promise<Device[]> {
    return this.devices.find({
      where: { userId, revokedAt: IsNull(), expiresAt: MoreThan(now) },
      order: { lastSeenAt: "DESC" },
    });
  }

  async touch(id: string, expiresAt: Date, now: Date): Promise<void> {
    await this.devices.update({ id }, { expiresAt, lastSeenAt: now });
  }

  async rename(id: string, name: string): Promise<void> {
    await this.devices.update({ id }, { name });
  }

  async revoke(id: string, now: Date): Promise<void> {
    await this.devices.update({ id, revokedAt: IsNull() }, { revokedAt: now });
  }

  async revokeAllExcept(
    userId: string,
    keepId: string,
    now: Date,
  ): Promise<void> {
    await this.devices.update(
      { userId, id: Not(keepId), revokedAt: IsNull() },
      { revokedAt: now },
    );
  }

  async purgeEndedBefore(before: Date): Promise<number> {
    const result = await this.devices
      .createQueryBuilder()
      .delete()
      .where("revoked_at < :before OR expires_at < :before", { before })
      .execute();
    return result.affected ?? 0;
  }
}
