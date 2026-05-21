import type { TeacherAttendanceDocument } from "@/lib/models/TeacherAttendance";

export function serializeTeacherAttendance(doc: TeacherAttendanceDocument) {
  return {
    id: doc._id.toString(),
    teacherId: doc.teacherId.toString(),
    batchId: doc.batchId.toString(),
    attendanceDate: doc.attendanceDate,
    status: doc.status,
    remarks: doc.remarks ?? "",
    markedAt: doc.markedAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
  };
}
