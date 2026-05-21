import mongoose from "mongoose";
import type { BatchDocument, BatchEmbeddedStudent } from "@/lib/models/Batch";

function serializeStudent(s: BatchEmbeddedStudent) {
  return {
    id: s._id.toString(),
    studentName: s.studentName,
    studentEmail: s.studentEmail,
    phone: s.phone,
    course: s.course,
    batchDay: s.batchDay,
    batchTime: s.batchTime,
    startMonth: s.startMonth,
    endMonth: s.endMonth,
  };
}

function serializeTeacher(t: { _id: mongoose.Types.ObjectId; fullName?: string; email?: string }) {
  return {
    id: t._id.toString(),
    fullName: t.fullName ?? "",
    email: t.email ?? "",
  };
}

export function serializeBatch(doc: BatchDocument) {
  const populated = doc.populated("teacherIds");
  let teachers: ReturnType<typeof serializeTeacher>[] | undefined;
  let teacherIds: string[];

  if (populated) {
    const pts = doc.teacherIds as unknown as { _id: mongoose.Types.ObjectId; fullName?: string; email?: string }[];
    teachers = pts.map(serializeTeacher);
    teacherIds = teachers.map(t => t.id);
  } else {
    teacherIds = (doc.teacherIds as mongoose.Types.ObjectId[]).map(id => id.toString());
  }

  const batchTiming =
    doc.batchTiming || (doc.batchDay && doc.batchTime ? `${doc.batchDay} · ${doc.batchTime}` : "");

  return {
    id: doc._id.toString(),
    batchName: doc.batchName,
    batchCode: doc.batchCode ?? "",
    courseName: doc.courseName,
    batchTiming,
    batchDay: doc.batchDay,
    batchTime: doc.batchTime,
    startDate: doc.startDate ?? doc.startMonth,
    endDate: doc.endDate ?? doc.endMonth,
    startMonth: doc.startMonth,
    endMonth: doc.endMonth,
    roomNumber: doc.roomNumber ?? doc.branch ?? "",
    branch: doc.branch,
    maxStudents: doc.maxStudents ?? doc.batchCapacity,
    batchCapacity: doc.batchCapacity,
    batchStatus: doc.batchStatus ?? "Active",
    description: doc.description,
    students: doc.students.map(serializeStudent),
    assignedStudents: doc.students.map(serializeStudent),
    teacherIds,
    assignedTeachers: teacherIds,
    teachers,
    totalStudents: doc.students.length,
    attendanceSummary: doc.attendanceSummary,
    createdBy: doc.createdBy?.toString() ?? "",
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
