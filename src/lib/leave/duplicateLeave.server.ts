import mongoose, { type Model } from "mongoose";
import { normalizeLeaveReason } from "@/lib/leave/normalizeLeaveReason";
import {
  DUPLICATE_LEAVE_RECENT_MS,
  type LeaveDuplicateInput,
} from "@/lib/leave/duplicateLeave";
import type { LeaveType } from "@/lib/models/Leave";

export { DUPLICATE_LEAVE_ERROR, DUPLICATE_LEAVE_TOAST } from "@/lib/leave/duplicateLeave";

export function isMongoDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: number }).code === 11000
  );
}

type DuplicateLeaveDoc = {
  _id: unknown;
  status: string;
  createdAt?: Date;
};

/**
 * Returns true if an equivalent leave already exists for this user:
 * same type, dates, reason, and either Pending or created within the recent window.
 */
export async function hasDuplicateLeaveRequest(
  model: Model<DuplicateLeaveDoc>,
  userIdField: "teacherId" | "seniorTeacherId",
  userId: string,
  input: LeaveDuplicateInput & { leaveType: LeaveType },
  recentMs = DUPLICATE_LEAVE_RECENT_MS,
): Promise<boolean> {
  const reason = normalizeLeaveReason(input.reason);
  const since = new Date(Date.now() - recentMs);

  const userOid = new mongoose.Types.ObjectId(userId);

  const existing = await model
    .findOne({
      [userIdField]: userOid,
      leaveType: input.leaveType,
      fromDate: input.fromDate,
      toDate: input.toDate,
      reason,
      $or: [{ status: "Pending" }, { createdAt: { $gte: since } }],
    })
    .select("_id")
    .lean();

  return Boolean(existing);
}

export type CreateLeaveResult<T> =
  | { ok: true; doc: T }
  | { ok: false; duplicate: true };

/**
 * Check-then-create with MongoDB duplicate-key fallback for concurrent POSTs.
 */
export async function createLeaveWithDuplicateProtection<T extends DuplicateLeaveDoc>(
  model: Model<T>,
  userIdField: "teacherId" | "seniorTeacherId",
  userId: string,
  input: LeaveDuplicateInput & { leaveType: LeaveType },
  buildDoc: (storedReason: string) => Record<string, unknown>,
): Promise<CreateLeaveResult<T>> {
  const duplicate = await hasDuplicateLeaveRequest(model, userIdField, userId, input);
  if (duplicate) return { ok: false, duplicate: true };

  try {
    const doc = (await model.create(buildDoc(normalizeLeaveReason(input.reason)))) as T;
    return { ok: true, doc };
  } catch (err) {
    if (isMongoDuplicateKeyError(err)) return { ok: false, duplicate: true };
    throw err;
  }
}
