import { Inject, Injectable } from "@nestjs/common";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import {
  DEVICE_REPOSITORY,
  type DeviceRepositoryPort,
} from "@/modules/identity/application/ports/device-repository.port";
import {
  SECRETS,
  type SecretsPort,
} from "@/modules/identity/application/ports/secrets.port";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/identity/application/ports/user-repository.port";
import {
  SessionTokensService,
  type IssuedTokens,
} from "@/modules/identity/application/session-tokens.service";
import { isDeviceLive } from "@/modules/identity/domain/device";
import { parseRefreshToken } from "@/modules/identity/domain/refresh-token";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

// A signed-in device trades its refresh token for a new access token.
@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(DEVICE_REPOSITORY) private readonly devices: DeviceRepositoryPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(SECRETS) private readonly secrets: SecretsPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly sessionTokens: SessionTokensService,
  ) {}

  async execute(refreshToken: string): Promise<IssuedTokens> {
    const parsed = parseRefreshToken(refreshToken);
    const device = parsed
      ? await this.devices.findById(parsed.sessionId)
      : null;
    if (
      !parsed ||
      !device ||
      !isDeviceLive(device, this.clock.now()) ||
      !this.secrets.sameDigest(
        this.secrets.digest(parsed.secret),
        device.refreshSecretHash,
      )
    ) {
      throw AppException.from(APP_ERRORS.identity.refreshInvalid, undefined);
    }
    const user = await this.users.findById(device.userId);
    if (!user?.active) {
      throw AppException.from(APP_ERRORS.identity.userInactive, undefined);
    }
    return this.sessionTokens.extend(user.id, device.id, parsed.secret);
  }
}
