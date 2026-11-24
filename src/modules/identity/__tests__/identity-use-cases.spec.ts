import type { ConfigService } from "@nestjs/config";
import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { AppException } from "@/common/exceptions/app-exception";
import { IdentityConfig } from "@/modules/identity/application/identity.config";
import type { DeviceRepositoryPort } from "@/modules/identity/application/ports/device-repository.port";
import type { UserRepositoryPort } from "@/modules/identity/application/ports/user-repository.port";
import { SessionTokensService } from "@/modules/identity/application/session-tokens.service";
import { AuthenticateUseCase } from "@/modules/identity/application/use-cases/authenticate.use-case";
import { ChangeOwnPasswordUseCase } from "@/modules/identity/application/use-cases/change-own-password.use-case";
import { LoginUseCase } from "@/modules/identity/application/use-cases/login.use-case";
import { ManageDevicesUseCase } from "@/modules/identity/application/use-cases/manage-devices.use-case";
import { RefreshSessionUseCase } from "@/modules/identity/application/use-cases/refresh-session.use-case";
import { DevicePlatform, type Device } from "@/modules/identity/domain/device";
import type { Credential, User } from "@/modules/identity/domain/user";
import { JwtAccessTokenService } from "@/modules/identity/infrastructure/crypto/jwt-access-token.service";
import { NodeSecrets } from "@/modules/identity/infrastructure/crypto/node-secrets";
import { ScryptPasswordHasher } from "@/modules/identity/infrastructure/crypto/scrypt-password-hasher";
import type { ClockPort } from "@/shared/application/ports/clock.port";

const PASSWORD = "senha-forte-2026";

class FakeClock implements ClockPort {
  constructor(public current = new Date("2026-11-23T12:00:00Z")) {}
  now(): Date {
    return new Date(this.current);
  }
}

class InMemoryUsers implements UserRepositoryPort {
  users = new Map<string, User>();
  credentials = new Map<string, Credential>();
  findById = (id: string) => Promise.resolve(this.users.get(id) ?? null);
  findByEmail = (email: string) =>
    Promise.resolve(
      [...this.users.values()].find((u) => u.email === email) ?? null,
    );
  count = () => Promise.resolve(this.users.size);
  activeIds = () =>
    Promise.resolve(
      [...this.users.values()].filter((u) => u.active).map((u) => u.id),
    );
  create(user: Pick<User, "name" | "email">, passwordHash: string) {
    const created: User = {
      ...user,
      id: `user-${this.users.size + 1}`,
      active: true,
      lastLoginAt: null,
      createdAt: new Date(),
    };
    this.users.set(created.id, created);
    this.credentials.set(created.id, {
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    return Promise.resolve(created);
  }
  findCredential = (id: string) =>
    Promise.resolve(this.credentials.get(id) ?? null);
  updateCredential(id: string, change: Partial<Credential>) {
    const current = this.credentials.get(id) as Credential;
    this.credentials.set(id, { ...current, ...change });
    return Promise.resolve();
  }
  touchLastLogin = () => Promise.resolve();
}

class InMemoryDevices implements DeviceRepositoryPort {
  devices = new Map<string, Device>();
  create(
    device: Omit<Device, "createdAt" | "lastSeenAt" | "revokedAt">,
    now: Date,
  ) {
    this.devices.set(device.id, {
      ...device,
      createdAt: now,
      lastSeenAt: now,
      revokedAt: null,
    });
    return Promise.resolve();
  }
  findById = (id: string) => Promise.resolve(this.devices.get(id) ?? null);
  listLive = (userId: string, now: Date) =>
    Promise.resolve(
      [...this.devices.values()].filter(
        (d) => d.userId === userId && !d.revokedAt && d.expiresAt > now,
      ),
    );
  touch(id: string, expiresAt: Date, now: Date) {
    const d = this.devices.get(id) as Device;
    this.devices.set(id, { ...d, expiresAt, lastSeenAt: now });
    return Promise.resolve();
  }
  rename(id: string, name: string) {
    const d = this.devices.get(id) as Device;
    this.devices.set(id, { ...d, name });
    return Promise.resolve();
  }
  revoke(id: string, now: Date) {
    const d = this.devices.get(id) as Device;
    this.devices.set(id, { ...d, revokedAt: now });
    return Promise.resolve();
  }
  async revokeAllExcept(userId: string, keepId: string, now: Date) {
    for (const d of this.devices.values()) {
      if (d.userId === userId && d.id !== keepId) await this.revoke(d.id, now);
    }
  }
  purgeEndedBefore = () => Promise.resolve(0);
}

async function setup() {
  const env: Record<string, unknown> = {
    JWT_ACCESS_SECRET: "j".repeat(48),
    AUTH_HASH_SECRET: "h".repeat(48),
  };
  const config = {
    get: (key: string, fallback?: unknown) => env[key] ?? fallback,
    getOrThrow: (key: string) => env[key],
  } as unknown as ConfigService;
  const clock = new FakeClock();
  const users = new InMemoryUsers();
  const devices = new InMemoryDevices();
  const hasher = new ScryptPasswordHasher();
  const secrets = new NodeSecrets(config);
  const tokens = new JwtAccessTokenService(config);
  const identityConfig = new IdentityConfig(config);
  const sessions = new SessionTokensService(
    devices,
    tokens,
    secrets,
    clock,
    identityConfig,
  );
  const owner = await users.create(
    { name: "Stanley", email: "owner@example.com" },
    await hasher.hash(PASSWORD),
  );
  return {
    clock,
    users,
    devices,
    owner,
    login: new LoginUseCase(
      users,
      hasher,
      secrets,
      clock,
      sessions,
      identityConfig,
    ),
    refresh: new RefreshSessionUseCase(
      devices,
      users,
      secrets,
      clock,
      sessions,
    ),
    authenticate: new AuthenticateUseCase(tokens, devices, users, clock),
    manage: new ManageDevicesUseCase(devices, clock),
    changePassword: new ChangeOwnPasswordUseCase(users, devices, hasher, clock),
  };
}

const desktop = { deviceName: "PC", platform: DevicePlatform.WINDOWS };
const phone = { deviceName: "Celular", platform: DevicePlatform.ANDROID };

function codeOf(error: unknown): string | undefined {
  return error instanceof AppException
    ? (error.getResponse() as { code: string }).code
    : undefined;
}

describe("identity use cases", () => {
  it("logs a device in, authenticates it and refreshes its token", async () => {
    const t = await setup();
    const tokens = await t.login.execute({
      email: " OWNER@example.com ",
      password: PASSWORD,
      ...desktop,
    });
    const caller = await t.authenticate.execute(tokens.accessToken);
    expect(caller).toEqual({
      id: t.owner.id,
      deviceId: tokens.deviceId,
      name: "Stanley",
      email: "owner@example.com",
    });
    const renewed = await t.refresh.execute(tokens.refreshToken);
    expect(renewed.deviceId).toBe(tokens.deviceId);
  });

  it("rejects a wrong password and locks after repeated attempts", async () => {
    const t = await setup();
    const attempt = () =>
      t.login.execute({
        email: "owner@example.com",
        password: "x",
        ...desktop,
      });
    for (let i = 0; i < 4; i++) {
      expect(codeOf(await attempt().catch((e: unknown) => e))).toBe(
        "IDENTITY_INVALID_CREDENTIALS",
      );
    }
    expect(codeOf(await attempt().catch((e: unknown) => e))).toBe(
      "IDENTITY_ACCOUNT_LOCKED",
    );
    // Even the right password waits for the lock to end.
    expect(
      codeOf(
        await t.login
          .execute({
            email: "owner@example.com",
            password: PASSWORD,
            ...desktop,
          })
          .catch((e: unknown) => e),
      ),
    ).toBe("IDENTITY_ACCOUNT_LOCKED");
  });

  it("does not reveal unknown e-mails", async () => {
    const t = await setup();
    const error = await t.login
      .execute({ email: "nobody@example.com", password: PASSWORD, ...desktop })
      .catch((e: unknown) => e);
    expect(codeOf(error)).toBe("IDENTITY_INVALID_CREDENTIALS");
  });

  it("removing a device signs it out at once", async () => {
    const t = await setup();
    const pc = await t.login.execute({
      email: "owner@example.com",
      password: PASSWORD,
      ...desktop,
    });
    const cel = await t.login.execute({
      email: "owner@example.com",
      password: PASSWORD,
      ...phone,
    });
    const caller = await t.authenticate.execute(pc.accessToken);
    expect(await t.manage.list(caller)).toHaveLength(2);

    await t.manage.remove(caller, cel.deviceId);
    expect(
      codeOf(await t.authenticate.execute(cel.accessToken).catch((e) => e)),
    ).toBe("IDENTITY_SESSION_REQUIRED");
    expect(
      codeOf(await t.refresh.execute(cel.refreshToken).catch((e) => e)),
    ).toBe("IDENTITY_REFRESH_INVALID");
    expect(await t.manage.list(caller)).toHaveLength(1);
  });

  it("does not touch devices of someone else", async () => {
    const t = await setup();
    const pc = await t.login.execute({
      email: "owner@example.com",
      password: PASSWORD,
      ...desktop,
    });
    const stranger: AuthenticatedUser = {
      id: "user-x",
      deviceId: "d",
      name: "X",
      email: "x@example.com",
    };
    expect(
      codeOf(await t.manage.remove(stranger, pc.deviceId).catch((e) => e)),
    ).toBe("IDENTITY_DEVICE_NOT_FOUND");
  });

  it("changing the password signs out the other devices", async () => {
    const t = await setup();
    const pc = await t.login.execute({
      email: "owner@example.com",
      password: PASSWORD,
      ...desktop,
    });
    const cel = await t.login.execute({
      email: "owner@example.com",
      password: PASSWORD,
      ...phone,
    });
    const caller = await t.authenticate.execute(pc.accessToken);

    expect(
      codeOf(
        await t.changePassword
          .execute(caller, { currentPassword: PASSWORD, newPassword: "curta" })
          .catch((e) => e),
      ),
    ).toBe("IDENTITY_WEAK_PASSWORD");

    await t.changePassword.execute(caller, {
      currentPassword: PASSWORD,
      newPassword: "outra-senha-forte-7",
    });
    await expect(t.authenticate.execute(pc.accessToken)).resolves.toBeTruthy();
    expect(
      codeOf(await t.authenticate.execute(cel.accessToken).catch((e) => e)),
    ).toBe("IDENTITY_SESSION_REQUIRED");
  });

  it("an expired device cannot refresh", async () => {
    const t = await setup();
    const pc = await t.login.execute({
      email: "owner@example.com",
      password: PASSWORD,
      ...desktop,
    });
    t.clock.current = new Date(t.clock.current.getTime() + 91 * 86_400_000);
    expect(
      codeOf(await t.refresh.execute(pc.refreshToken).catch((e) => e)),
    ).toBe("IDENTITY_REFRESH_INVALID");
  });
});
