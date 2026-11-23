// Random secrets and their one-way digests (refresh secrets are stored only
// as digests).
export interface SecretsPort {
  /** URL-safe random token (≥ 256 bits). */
  randomToken(): string;
  /** Keyed digest (HMAC) — comparable, never reversible. */
  digest(value: string): string;
  /** Constant-time comparison of two digests. */
  sameDigest(a: string, b: string): boolean;
}

export const SECRETS = Symbol("SECRETS");
