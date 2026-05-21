import mongoose from "mongoose";
import type { BatchAccess } from "@/lib/auth/require-batch-access";
import Batch from "@/lib/models/Batch";

/** Batch filter for senior teacher scope (matches batch list). */
export function seniorBatchScopeFilter(seniorTeacherId: string): Record<string, unknown> {
  const seniorOid = new mongoose.Types.ObjectId(seniorTeacherId);
  return {
    $or: [
      { createdBy: seniorOid },
      { createdBy: { $exists: false } },
      { createdBy: null },
    ],
  };
}

export async function getScopedBatchIds(access: BatchAccess): Promise<mongoose.Types.ObjectId[] | null> {
  if (access.kind === "admin") return null;
  if (access.kind === "senior" && access.seniorTeacherId) {
    const rows = await Batch.find(seniorBatchScopeFilter(access.seniorTeacherId)).select("_id").lean();
    return rows.map(r => r._id as mongoose.Types.ObjectId);
  }
  return [];
}

export async function seniorCanAccessBatch(seniorTeacherId: string, batchId: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(batchId)) return false;
  const count = await Batch.countDocuments({
    _id: new mongoose.Types.ObjectId(batchId),
    ...seniorBatchScopeFilter(seniorTeacherId),
  });
  return count > 0;
}
