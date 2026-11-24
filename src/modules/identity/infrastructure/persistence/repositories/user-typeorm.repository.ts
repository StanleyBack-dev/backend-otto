import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import type { UserRepositoryPort } from "@/modules/identity/application/ports/user-repository.port";
import type { Credential, User } from "@/modules/identity/domain/user";
import { UserOrmEntity } from "@/modules/identity/infrastructure/persistence/entities/user.orm-entity";

function toUser(row: UserOrmEntity): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    active: row.active,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class UserTypeormRepository implements UserRepositoryPort {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly users: Repository<UserOrmEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.users.findOneBy({ id });
    return row ? toUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.users.findOneBy({ email });
    return row ? toUser(row) : null;
  }

  count(): Promise<number> {
    return this.users.count();
  }

  async activeIds(): Promise<string[]> {
    const rows = await this.users.find({
      where: { active: true },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  async create(
    user: Pick<User, "name" | "email">,
    passwordHash: string,
  ): Promise<User> {
    const row = await this.users.save(
      this.users.create({ ...user, passwordHash }),
    );
    return toUser(row);
  }

  async findCredential(userId: string): Promise<Credential | null> {
    const row = await this.users.findOne({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });
    return row
      ? {
          passwordHash: row.passwordHash,
          failedLoginAttempts: row.failedLoginAttempts,
          lockedUntil: row.lockedUntil,
        }
      : null;
  }

  async updateCredential(
    userId: string,
    change: Partial<Credential>,
  ): Promise<void> {
    await this.users.update({ id: userId }, change);
  }

  async touchLastLogin(userId: string, at: Date): Promise<void> {
    await this.users.update({ id: userId }, { lastLoginAt: at });
  }
}
