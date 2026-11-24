import { Inject, Injectable } from "@nestjs/common";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/identity/application/ports/user-repository.port";

// The accounts the scheduled routines (morning briefing) work for.
@Injectable()
export class ActiveUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
  ) {}

  ids(): Promise<string[]> {
    return this.users.activeIds();
  }

  async name(userId: string): Promise<string> {
    return (await this.users.findById(userId))?.name ?? "";
  }
}
