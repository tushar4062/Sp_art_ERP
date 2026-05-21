/** Canonical email for storage and login lookup */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
