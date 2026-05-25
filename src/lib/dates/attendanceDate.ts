/**
 * Date-only attendance handling (YYYY-MM-DD) without UTC day shifts.
 * Default timezone: Asia/Kolkata (Indian Standard Time).
 */

export const APP_TIMEZONE = "Asia/Kolkata";

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Format a Date as YYYY-MM-DD in the given timezone (never uses toISOString for display). */
export function formatDateOnly(value: Date, timeZone: string = APP_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const y = parts.find(p => p.type === "year")?.value ?? "0000";
  const m = parts.find(p => p.type === "month")?.value ?? "01";
  const d = parts.find(p => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

/** Today's date as YYYY-MM-DD in app timezone. */
export function todayDateString(timeZone: string = APP_TIMEZONE): string {
  return formatDateOnly(new Date(), timeZone);
}

/** Current month as YYYY-MM. */
export function currentMonthString(timeZone: string = APP_TIMEZONE): string {
  return todayDateString(timeZone).slice(0, 7);
}

/**
 * Normalize any input to YYYY-MM-DD or null.
 * Accepts date-only strings, ISO timestamps, and Date objects.
 */
export function normalizeDateOnly(input: unknown, timeZone: string = APP_TIMEZONE): string | null {
  if (input == null) return null;

  if (typeof input === "string") {
    const trimmed = input.trim();
    const direct = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (direct && DATE_ONLY_RE.test(direct[1])) return direct[1];
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return formatDateOnly(parsed, timeZone);
    return null;
  }

  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return formatDateOnly(input, timeZone);
  }

  return null;
}

export function isValidDateOnly(value: string): boolean {
  return DATE_ONLY_RE.test(value.trim());
}

/** Inclusive start/end date strings for a calendar month (YYYY-MM). */
export function monthDateBounds(month: string): { start: string; end: string } | null {
  const m = month.trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  const lastDay = new Date(year, mo, 0).getDate();
  return {
    start: `${m[1]}-${m[2]}-01`,
    end: `${m[1]}-${m[2]}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** True if date-only string is strictly before today (app timezone). */
export function isDateBeforeToday(date: string, timeZone: string = APP_TIMEZONE): boolean {
  const norm = normalizeDateOnly(date, timeZone);
  if (!norm) return true;
  return norm < todayDateString(timeZone);
}

/** Read YYYY-MM-DD from new or legacy attendance documents. */
export function attendanceDateFromDoc(doc: {
  attendanceDate?: string | null;
  date?: Date | string | null;
}): string {
  if (doc.attendanceDate && isValidDateOnly(doc.attendanceDate)) {
    return doc.attendanceDate.trim();
  }
  if (doc.date != null) {
    const normalized = normalizeDateOnly(doc.date);
    if (normalized) return normalized;
  }
  return "";
}
