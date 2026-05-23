/** Shared leave date rules: no past dates; to >= from. */

export const PAST_DATE_MESSAGE = "Previous dates are not allowed";
export const FUTURE_DATE_MESSAGE = "Future dates are not allowed";
export const TODAY_ONLY_MESSAGE = "Attendance can only be marked for today";

/** Today's date as YYYY-MM-DD (local timezone). */
export function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True if date string (YYYY-MM-DD) is strictly before today. */
export function isDateBeforeToday(date: string): boolean {
  const norm = date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(norm)) return true;
  return norm < todayDateString();
}

/** True if date string (YYYY-MM-DD) is strictly after today. */
export function isDateAfterToday(date: string): boolean {
  const norm = date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(norm)) return true;
  return norm > todayDateString();
}

/** Staff day-wise attendance: only the current calendar day. */
export function isAttendanceDateAllowed(date: string): boolean {
  const norm = date.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(norm) && norm === todayDateString();
}

export function attendanceDateValidationError(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return "Invalid date";
  if (isDateBeforeToday(date)) return PAST_DATE_MESSAGE;
  if (isDateAfterToday(date)) return FUTURE_DATE_MESSAGE;
  if (!isAttendanceDateAllowed(date)) return TODAY_ONLY_MESSAGE;
  return null;
}

export type LeaveDateValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function leaveDateValidationError(
  result: LeaveDateValidationResult,
): string | null {
  return result.ok === false ? result.error : null;
}

export function validateLeaveDateRange(fromDate: string, toDate: string): LeaveDateValidationResult {
  const from = fromDate.trim();
  const to = toDate.trim();

  if (!from || !to) {
    return { ok: false, error: "From and To dates are required" };
  }

  if (isDateBeforeToday(from) || isDateBeforeToday(to)) {
    return { ok: false, error: PAST_DATE_MESSAGE };
  }

  if (from > to) {
    return { ok: false, error: "From date cannot be after To date" };
  }

  return { ok: true };
}
