import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from "@/modules/identity/application/ports/password-hasher.port";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/identity/application/ports/user-repository.port";
import { checkPassword } from "@/modules/identity/domain/password-policy";
import { normalizeEmail } from "@/modules/identity/domain/user";

// There is no sign-up: the owner account is created from BOOTSTRAP_OWNER_*
// on boot while the database has no user. Never fails the boot: a bad
// configuration is logged and skipped. Turn it off once the account exists.
@Injectable()
export class BootstrapOwnerUseCase {
  private readonly logger = new Logger(BootstrapOwnerUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    private readonly config: ConfigService,
  ) {}

  async execute(): Promise<void> {
    if (this.config.get<boolean>("BOOTSTRAP_OWNER_ENABLED") !== true) return;
    if ((await this.users.count()) > 0) return;

    const name = this.config.get<string>("BOOTSTRAP_OWNER_NAME")?.trim();
    const email = normalizeEmail(
      this.config.get<string>("BOOTSTRAP_OWNER_EMAIL") ?? "",
    );
    const password = this.config.get<string>("BOOTSTRAP_OWNER_PASSWORD") ?? "";

    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      this.logger.error(
        "Owner bootstrap skipped: set a valid BOOTSTRAP_OWNER_NAME and BOOTSTRAP_OWNER_EMAIL.",
      );
      return;
    }
    const violations = checkPassword(password, { email });
    if (violations.length > 0) {
      this.logger.error(
        `Owner bootstrap skipped: BOOTSTRAP_OWNER_PASSWORD needs ${violations.join(", ")}.`,
      );
      return;
    }
    await this.users.create({ name, email }, await this.hasher.hash(password));
    this.logger.warn(
      "Owner account created. Set BOOTSTRAP_OWNER_ENABLED=false and remove the password from the env.",
    );
  }
}
