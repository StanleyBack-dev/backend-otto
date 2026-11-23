import type { Credential, User } from "@/modules/identity/domain/user";

export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  count(): Promise<number>;
  create(
    user: Pick<User, "name" | "email">,
    passwordHash: string,
  ): Promise<User>;
  findCredential(userId: string): Promise<Credential | null>;
  updateCredential(userId: string, change: Partial<Credential>): Promise<void>;
  touchLastLogin(userId: string, at: Date): Promise<void>;
}

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");
