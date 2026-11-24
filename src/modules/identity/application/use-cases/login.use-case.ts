import { Inject, Injectable } from "@nestjs/common";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import { reportSystemEvent } from "@/common/logging/system-events";
import { IdentityConfig } from "@/modules/identity/application/identity.config";
import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from "@/modules/identity/application/ports/password-hasher.port";
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
import {
  normalizeDeviceName,
  type DevicePlatform,
} from "@/modules/identity/domain/device";
import {
  afterFailedLogin,
  isLocked,
  UNLOCKED,
} from "@/modules/identity/domain/lockout-policy";
import { normalizeEmail, type User } from "@/modules/identity/domain/user";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

export type LoginInput = {
  email: string;
  password: string;
  deviceName: string;
  platform: DevicePlatform;
};

export type LoginResult = IssuedTokens & { user: User };

// Signs a device in. Each login registers a new device (session), so the
// desktop app and a phone stay signed in independently.
@Injectable()
export class LoginUseCase {
  // Hash checked when the e-mail is unknown, so the response time does not
  // reveal whether an account exists.
  private decoyHash: Promise<string> | null = null;

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    @Inject(SECRETS) private readonly secrets: SecretsPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly sessionTokens: SessionTokensService,
    private readonly config: IdentityConfig,
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const user = await this.users.findByEmail(normalizeEmail(input.email));
    const credential = user ? await this.users.findCredential(user.id) : null;

    if (!user || !credential) {
      await this.hasher.verify(input.password, await this.getDecoyHash());
      throw AppException.from(
        APP_ERRORS.identity.invalidCredentials,
        undefined,
      );
    }

    const now = this.clock.now();
    if (isLocked(credential, now)) {
      throw this.lockedError(credential.lockedUntil as Date, now);
    }

    if (!(await this.hasher.verify(input.password, credential.passwordHash))) {
      const next = afterFailedLogin(credential, now, this.config.lockout);
      await this.users.updateCredential(user.id, next);
      if (next.lockedUntil) {
        reportSystemEvent({
          level: "WARN",
          category: "SECURITY",
          source: "Login: account locked",
          message: "The account was locked after repeated wrong passwords.",
        });
        throw this.lockedError(next.lockedUntil, now);
      }
      throw AppException.from(
        APP_ERRORS.identity.invalidCredentials,
        undefined,
      );
    }

    // Only after the right password: an inactive account is not revealed to
    // someone guessing.
    if (!user.active) {
      throw AppException.from(APP_ERRORS.identity.userInactive, undefined);
    }
    if (credential.failedLoginAttempts > 0 || credential.lockedUntil) {
      await this.users.updateCredential(user.id, UNLOCKED);
    }
    await this.users.touchLastLogin(user.id, now);

    const tokens = await this.sessionTokens.open(user.id, {
      name: normalizeDeviceName(input.deviceName) || "Dispositivo",
      platform: input.platform,
    });
    return { ...tokens, user };
  }

  private lockedError(lockedUntil: Date, now: Date): AppException {
    const minutes = Math.max(
      1,
      Math.ceil((lockedUntil.getTime() - now.getTime()) / 60_000),
    );
    return AppException.from(APP_ERRORS.identity.accountLocked, { minutes });
  }

  private getDecoyHash(): Promise<string> {
    this.decoyHash ??= this.hasher.hash(this.secrets.randomToken());
    return this.decoyHash;
  }
}
