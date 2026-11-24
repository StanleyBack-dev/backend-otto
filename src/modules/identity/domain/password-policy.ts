export const PASSWORD_MIN_LENGTH = 10;

/** The rules the password breaks (empty when it is acceptable). */
export function checkPassword(
  password: string,
  context: { email?: string } = {},
): string[] {
  const violations: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    violations.push(`pelo menos ${PASSWORD_MIN_LENGTH} caracteres`);
  }
  if (!/[A-Za-z]/.test(password)) violations.push("uma letra");
  if (!/\d/.test(password)) violations.push("um número");
  const local = context.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 3 && password.toLowerCase().includes(local)) {
    violations.push("nada do seu e-mail");
  }
  return violations;
}
