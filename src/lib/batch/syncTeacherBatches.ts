import mongoose from "mongoose";
import Teacher from "@/lib/models/Teacher";

/** Keep Teacher.assignedBatches in sync with Batch.teacherIds */
export async function syncTeacherAssignedBatches(
  batchId: string,
  assignedTeacherIds: string[],
) {
  const batchOid = new mongoose.Types.ObjectId(batchId);
  const teacherOids = assignedTeacherIds
    .filter(id => mongoose.Types.ObjectId.isValid(id))
    .map(id => new mongoose.Types.ObjectId(id));

  await Teacher.updateMany({ assignedBatches: batchOid }, { $pull: { assignedBatches: batchOid } });

  if (teacherOids.length) {
    await Teacher.updateMany(
      { _id: { $in: teacherOids } },
      { $addToSet: { assignedBatches: batchOid } },
    );
  }
}

export async function removeBatchFromAllTeachers(batchId: string) {
  const batchOid = new mongoose.Types.ObjectId(batchId);
  await Teacher.updateMany({ assignedBatches: batchOid }, { $pull: { assignedBatches: batchOid } });
}
