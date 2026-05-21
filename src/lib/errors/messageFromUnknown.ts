/** Normalize thrown values (including DOM Event) for UI and logs. */
export function messageFromUnknown(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const e = error as { message?: string; type?: string };
    if (typeof e.message === "string" && e.message.trim()) return e.message;
    if (e.type === "error") return "A resource failed to load. Refresh the page.";
    if (typeof Event !== "undefined" && error instanceof Event) {
      return "An unexpected browser event occurred. Please try again.";
    }
  }
  return fallback;
}
