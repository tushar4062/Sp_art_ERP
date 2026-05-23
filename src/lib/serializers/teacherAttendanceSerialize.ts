import type { TeacherAttendanceDocument } from "@/lib/models/TeacherAttendance";

export function serializeTeacherAttendance(doc: TeacherAttendanceDocument) {
  return {
    id: doc._id.toString(),
    userId: doc.teacherId.toString(),
    userName: doc.userName ?? "",
    teacherId: doc.teacherId.toString(),
    role: doc.role ?? "teacher",
    batchId: doc.batchId.toString(),
    batchName: doc.batchName ?? "",
    attendanceDate: doc.attendanceDate,
    attendanceStatus: doc.status,
    status: doc.status,
    remarks: doc.remarks ?? "",
    markedAt: doc.markedAt?.toISOString?.() ?? new Date().toISOString(),
    createdAt: doc.createdAt.toISOString(),
  };
}
