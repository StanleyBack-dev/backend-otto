// The owner of the assistant. Otto has a single account, but nothing in the
// model assumes it: every row belongs to a user.
export type User = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export type Credential = {
  passwordHash: string;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
