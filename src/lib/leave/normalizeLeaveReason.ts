/** Matches API storage: empty reason is stored as em dash. */
export function normalizeLeaveReason(reason: string): string {
  const trimmed = reason.trim();
  return trimmed || "—";
}
