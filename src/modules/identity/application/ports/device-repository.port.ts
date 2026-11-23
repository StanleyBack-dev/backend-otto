import type { Device } from "@/modules/identity/domain/device";

export interface DeviceRepositoryPort {
  create(
    device: Omit<Device, "createdAt" | "lastSeenAt" | "revokedAt">,
    now: Date,
  ): Promise<void>;
  findById(id: string): Promise<Device | null>;
  /** The user's live devices, most recently seen first (a handful at most). */
  listLive(userId: string, now: Date): Promise<Device[]>;
  /** Slides the expiry and records the use. */
  touch(id: string, expiresAt: Date, now: Date): Promise<void>;
  rename(id: string, name: string): Promise<void>;
  revoke(id: string, now: Date): Promise<void>;
  /** Signs out every device of the user except `keepId`. */
  revokeAllExcept(userId: string, keepId: string, now: Date): Promise<void>;
  /** Deletes devices removed or expired before the date; returns how many. */
  purgeEndedBefore(before: Date): Promise<number>;
}

export const DEVICE_REPOSITORY = Symbol("DEVICE_REPOSITORY");
