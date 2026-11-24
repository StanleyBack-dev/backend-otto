import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { IdentityConfig } from "@/modules/identity/application/identity.config";
import {
  ACCESS_TOKEN,
  type AccessTokenPort,
} from "@/modules/identity/application/ports/access-token.port";
import {
  DEVICE_REPOSITORY,
  type DeviceRepositoryPort,
} from "@/modules/identity/application/ports/device-repository.port";
import {
  SECRETS,
  type SecretsPort,
} from "@/modules/identity/application/ports/secrets.port";
import type { DevicePlatform } from "@/modules/identity/domain/device";
import { composeRefreshToken } from "@/modules/identity/domain/refresh-token";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

export type IssuedTokens = {
  deviceId: string;
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

@Injectable()
export class SessionTokensService {
  constructor(
    @Inject(DEVICE_REPOSITORY) private readonly devices: DeviceRepositoryPort,
    @Inject(ACCESS_TOKEN) private readonly accessTokens: AccessTokenPort,
    @Inject(SECRETS) private readonly secrets: SecretsPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly config: IdentityConfig,
  ) {}

  /** Registers the device (a new session) and issues its tokens. */
  async open(
    userId: string,
    device: { name: string; platform: DevicePlatform },
  ): Promise<IssuedTokens> {
    const deviceId = randomUUID();
    const secret = this.secrets.randomToken();
    const expiresAt = this.refreshExpiry();
    await this.devices.create(
      {
        id: deviceId,
        userId,
        name: device.name,
        platform: device.platform,
        refreshSecretHash: this.secrets.digest(secret),
        expiresAt,
      },
      this.clock.now(),
    );
    return this.issue(userId, deviceId, secret, expiresAt);
  }

  /** New access token for a signed-in device; slides its expiry. */
  async extend(
    userId: string,
    deviceId: string,
    secret: string,
  ): Promise<IssuedTokens> {
    const expiresAt = this.refreshExpiry();
    await this.devices.touch(deviceId, expiresAt, this.clock.now());
    return this.issue(userId, deviceId, secret, expiresAt);
  }

  private issue(
    userId: string,
    deviceId: string,
    secret: string,
    refreshTokenExpiresAt: Date,
  ): IssuedTokens {
    const access = this.accessTokens.sign({ userId, deviceId });
    return {
      deviceId,
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken: composeRefreshToken(deviceId, secret),
      refreshTokenExpiresAt,
    };
  }

  private refreshExpiry(): Date {
    return new Date(
      this.clock.now().getTime() + this.config.refreshTokenTtlDays * 86_400_000,
    );
  }
}
