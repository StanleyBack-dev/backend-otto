import { Inject, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import {
  DEVICE_REPOSITORY,
  type DeviceRepositoryPort,
} from "@/modules/identity/application/ports/device-repository.port";
import {
  isDeviceLive,
  normalizeDeviceName,
  type Device,
} from "@/modules/identity/domain/device";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

// The signed-in devices: list, rename, remove (sign out). Removing the
// current device is the logout.
@Injectable()
export class ManageDevicesUseCase {
  constructor(
    @Inject(DEVICE_REPOSITORY) private readonly devices: DeviceRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  list(user: AuthenticatedUser): Promise<Device[]> {
    return this.devices.listLive(user.id, this.clock.now());
  }

  async rename(
    user: AuthenticatedUser,
    deviceId: string,
    name: string,
  ): Promise<Device> {
    const device = await this.owned(user, deviceId);
    const normalized = normalizeDeviceName(name);
    if (normalized.length < 2) {
      throw AppException.from(APP_ERRORS.identity.invalidSettings, {
        reason: "O nome do dispositivo deve ter pelo menos 2 caracteres.",
      });
    }
    await this.devices.rename(device.id, normalized);
    return { ...device, name: normalized };
  }

  async remove(user: AuthenticatedUser, deviceId: string): Promise<void> {
    const device = await this.owned(user, deviceId);
    await this.devices.revoke(device.id, this.clock.now());
  }

  logout(user: AuthenticatedUser): Promise<void> {
    return this.remove(user, user.deviceId);
  }

  private async owned(
    user: AuthenticatedUser,
    deviceId: string,
  ): Promise<Device> {
    const device = await this.devices.findById(deviceId);
    if (
      !device ||
      device.userId !== user.id ||
      !isDeviceLive(device, this.clock.now())
    ) {
      throw AppException.from(APP_ERRORS.identity.deviceNotFound, undefined);
    }
    return device;
  }
}
