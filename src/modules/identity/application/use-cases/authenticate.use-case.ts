import { Inject, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import {
  ACCESS_TOKEN,
  type AccessTokenPort,
} from "@/modules/identity/application/ports/access-token.port";
import {
  DEVICE_REPOSITORY,
  type DeviceRepositoryPort,
} from "@/modules/identity/application/ports/device-repository.port";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/identity/application/ports/user-repository.port";
import { isDeviceLive } from "@/modules/identity/domain/device";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

// Turns an access token into the caller. The device is checked on every
// request, so removing a device signs it out at once, not when its access
// token expires.
@Injectable()
export class AuthenticateUseCase {
  constructor(
    @Inject(ACCESS_TOKEN) private readonly accessTokens: AccessTokenPort,
    @Inject(DEVICE_REPOSITORY) private readonly devices: DeviceRepositoryPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(token: string | null): Promise<AuthenticatedUser> {
    if (!token) {
      throw AppException.from(APP_ERRORS.identity.sessionRequired, undefined);
    }
    const verified = this.accessTokens.verify(token);
    if (verified.status === "expired") {
      throw AppException.from(APP_ERRORS.identity.sessionExpired, undefined);
    }
    if (verified.status === "invalid") {
      throw AppException.from(APP_ERRORS.identity.sessionRequired, undefined);
    }
    const { userId, deviceId } = verified.claims;
    const [device, user] = await Promise.all([
      this.devices.findById(deviceId),
      this.users.findById(userId),
    ]);
    if (
      !device ||
      device.userId !== userId ||
      !isDeviceLive(device, this.clock.now()) ||
      !user
    ) {
      throw AppException.from(APP_ERRORS.identity.sessionRequired, undefined);
    }
    if (!user.active) {
      throw AppException.from(APP_ERRORS.identity.userInactive, undefined);
    }
    return { id: user.id, deviceId, name: user.name, email: user.email };
  }
}
