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

/** The name as stored: trimmed, single spaces, 2–120 characters, or null. */
export function normalizeName(name: string): string | null {
  const value = name.trim().replace(/\s+/g, " ");
  return value.length >= 2 && value.length <= 120 ? value : null;
}
