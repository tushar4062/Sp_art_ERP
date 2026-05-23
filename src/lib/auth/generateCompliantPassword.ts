/** Password that satisfies credential policy (8+ chars, upper, lower, digit, special). */
export function generateCompliantPassword(length = 12): string {
  const specials = "@$!%*?&";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];

  const required = [pick(upper), pick(lower), pick(digits), pick(specials)];
  const pool = lower + upper + digits + specials;
  while (required.length < length) {
    required.push(pick(pool));
  }

  for (let i = required.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [required[i], required[j]] = [required[j], required[i]];
  }

  return required.join("");
}
