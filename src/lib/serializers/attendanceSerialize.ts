import type { AttendanceDocument } from "@/lib/models/Attendance";

export function serializeAttendance(doc: AttendanceDocument) {
  return {
    id: doc._id.toString(),
    studentId: doc.studentId.toString(),
    batchId: doc.batchId.toString(),
    teacherId: doc.teacherId.toString(),
    attendanceDate: doc.attendanceDate,
    status: doc.status,
    remarks: doc.remarks ?? "",
    markedBy: doc.markedBy.toString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
