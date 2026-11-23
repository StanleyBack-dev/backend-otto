import { Inject, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import {
  DEVICE_REPOSITORY,
  type DeviceRepositoryPort,
} from "@/modules/identity/application/ports/device-repository.port";
import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from "@/modules/identity/application/ports/password-hasher.port";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/identity/application/ports/user-repository.port";
import { checkPassword } from "@/modules/identity/domain/password-policy";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

// Changing the password signs out every other device: if the old password
// leaked, whoever used it loses access.
@Injectable()
export class ChangeOwnPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(DEVICE_REPOSITORY) private readonly devices: DeviceRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(
    user: AuthenticatedUser,
    input: { currentPassword: string; newPassword: string },
  ): Promise<void> {
    const credential = await this.users.findCredential(user.id);
    if (
      !credential ||
      !(await this.hasher.verify(
        input.currentPassword,
        credential.passwordHash,
      ))
    ) {
      throw AppException.from(
        APP_ERRORS.identity.wrongCurrentPassword,
        undefined,
      );
    }
    const violations = checkPassword(input.newPassword, { email: user.email });
    if (violations.length > 0) {
      throw AppException.from(APP_ERRORS.identity.weakPassword, {
        rules: violations.join(", "),
      });
    }
    await this.users.updateCredential(user.id, {
      passwordHash: await this.hasher.hash(input.newPassword),
    });
    await this.devices.revokeAllExcept(
      user.id,
      user.deviceId,
      this.clock.now(),
    );
  }
}
