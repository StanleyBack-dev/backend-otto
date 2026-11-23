import { Inject, Injectable } from "@nestjs/common";
import {
  DEVICE_REPOSITORY,
  type DeviceRepositoryPort,
} from "@/modules/identity/application/ports/device-repository.port";
import { DEVICE_RETENTION_DAYS } from "@/modules/identity/domain/device";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

// Daily cleanup: devices removed or expired past the retention.
@Injectable()
export class IdentityMaintenanceUseCase {
  constructor(
    @Inject(DEVICE_REPOSITORY) private readonly devices: DeviceRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  purgeEndedDevices(): Promise<number> {
    return this.devices.purgeEndedBefore(
      new Date(this.clock.now().getTime() - DEVICE_RETENTION_DAYS * 86_400_000),
    );
  }
}
