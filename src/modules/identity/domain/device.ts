// A device signed in to the assistant (the Windows desktop app, a phone…).
// Each device is one session: its refresh secret keeps it signed in, and
// removing the device signs it out. Changing phones is adding the new one
// and removing the old one — nothing about a device is fixed in the code.
export enum DevicePlatform {
  WINDOWS = "WINDOWS",
  MACOS = "MACOS",
  LINUX = "LINUX",
  ANDROID = "ANDROID",
  IOS = "IOS",
  WEB = "WEB",
}

export type Device = {
  id: string;
  userId: string;
  name: string;
  platform: DevicePlatform;
  refreshSecretHash: string;
  expiresAt: Date;
  lastSeenAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
};

export const DEVICE_NAME_MAX = 60;

/** Removed and expired devices are deleted after this many days. */
export const DEVICE_RETENTION_DAYS = 30;

export function isDeviceLive(
  device: Pick<Device, "revokedAt" | "expiresAt">,
  now: Date,
): boolean {
  return device.revokedAt === null && device.expiresAt > now;
}

export function normalizeDeviceName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, DEVICE_NAME_MAX);
}
