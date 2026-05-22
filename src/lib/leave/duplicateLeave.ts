/** Client-safe messages (no Node/Mongo imports). */
export const DUPLICATE_LEAVE_ERROR = "Leave request already submitted";
export const DUPLICATE_LEAVE_TOAST = "Leave request already exists";

/** Window for blocking rapid duplicate submissions (double-click / race). */
export const DUPLICATE_LEAVE_RECENT_MS = 10 * 60 * 1000;

export type LeaveDuplicateInput = {
  leaveType: "Casual" | "Sick" | "Personal";
  fromDate: string;
  toDate: string;
  reason: string;
};
