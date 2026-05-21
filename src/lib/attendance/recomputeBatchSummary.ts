import mongoose from "mongoose";
import Attendance from "@/lib/models/Attendance";
import Batch from "@/lib/models/Batch";

/** Recompute embedded batch.attendanceSummary from all attendance records. */
export async function recomputeBatchAttendanceSummary(batchId: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(batchId)) return;
  const batchOid = new mongoose.Types.ObjectId(batchId);

  const [dateRows, statusRows] = await Promise.all([
    Attendance.aggregate<{ _id: string }>([
      { $match: { batchId: batchOid } },
      { $group: { _id: "$attendanceDate" } },
    ]),
    Attendance.aggregate<{ _id: string; count: number }>([
      { $match: { batchId: batchOid } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const totalSessions = dateRows.length;
  const completedSessions = totalSessions;
  const present = statusRows.find(r => r._id === "Present")?.count ?? 0;
  const absent = statusRows.find(r => r._id === "Absent")?.count ?? 0;
  const total = present + absent;
  const averageAttendancePercent = total === 0 ? 0 : Math.round((present / total) * 100);

  await Batch.findByIdAndUpdate(batchId, {
    attendanceSummary: { totalSessions, completedSessions, averageAttendancePercent },
  });
}
