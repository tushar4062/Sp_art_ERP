/** Shared leave date rules: no past dates; to >= from. */

import { isDateBeforeToday as isAttendanceDateBeforeToday, todayDateString } from "@/lib/dates/attendanceDate";

export const PAST_DATE_MESSAGE = "Previous dates are not allowed";

export { todayDateString };

/** True if date string (YYYY-MM-DD) is strictly before today. */
export function isDateBeforeToday(date: string): boolean {
  return isAttendanceDateBeforeToday(date);
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
