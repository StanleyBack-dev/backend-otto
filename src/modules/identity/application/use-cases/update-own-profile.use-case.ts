import { Inject, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/identity/application/ports/user-repository.port";
import { normalizeName } from "@/modules/identity/domain/user";

// The owner's name, used by the assistant ("Bom dia, Stanley").
@Injectable()
export class UpdateOwnProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
  ) {}

  async execute(
    user: AuthenticatedUser,
    input: { name: string },
  ): Promise<AuthenticatedUser> {
    const name = normalizeName(input.name);
    if (!name) {
      throw AppException.from(APP_ERRORS.identity.invalidSettings, {
        reason: "O nome deve ter de 2 a 120 caracteres.",
      });
    }
    await this.users.updateName(user.id, name);
    return { ...user, name };
  }
}
