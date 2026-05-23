import mongoose from "mongoose";
import Batch from "@/lib/models/Batch";
import Teacher from "@/lib/models/Teacher";
import SeniorTeacher from "@/lib/models/SeniorTeacher";
import TeacherAttendance, {
  type StaffAttendanceRole,
  type TeacherAttendanceStatus,
} from "@/lib/models/TeacherAttendance";
import { serializeTeacherAttendance } from "@/lib/serializers/teacherAttendanceSerialize";
import {
  attendanceDateValidationError,
  todayDateString,
} from "@/lib/leave/dateValidation";
import { seniorBatchScopeFilter } from "@/lib/attendance/batchScope";

export type StaffRole = StaffAttendanceRole;

export function teacherAssignedBatchFilter(teacherId: string) {
  return { teacherIds: new mongoose.Types.ObjectId(teacherId) };
}

/** Same scope as senior teacher batch list (for self-attendance APIs). */
export function seniorTeacherAssignedBatchFilter(seniorTeacherId: string) {
  return seniorBatchScopeFilter(seniorTeacherId);
}

export async function staffCanAccessBatch(
  role: StaffRole,
  userId: string,
  batchId: string,
): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(batchId)) return false;
  const filter =
    role === "teacher"
      ? { _id: new mongoose.Types.ObjectId(batchId), ...teacherAssignedBatchFilter(userId) }
      : { _id: new mongoose.Types.ObjectId(batchId), ...seniorTeacherAssignedBatchFilter(userId) };
  const count = await Batch.countDocuments(filter);
  return count > 0;
}

export async function listAssignedBatchesForStaff(role: StaffRole, userId: string) {
  const filter =
    role === "teacher"
      ? teacherAssignedBatchFilter(userId)
      : seniorTeacherAssignedBatchFilter(userId);
  const rows = await Batch.find(filter)
    .select("batchName courseName batchDay batchTime batchTiming students")
    .sort({ batchName: 1 })
    .lean();
  return rows.map(b => ({
    id: (b._id as mongoose.Types.ObjectId).toString(),
    batchName: b.batchName,
    courseName: b.courseName,
    batchTiming: b.batchTiming || `${b.batchDay} · ${b.batchTime}`,
    totalStudents: (b.students as unknown[])?.length ?? 0,
  }));
}

export async function getStaffAttendanceRecord(
  role: StaffRole,
  userId: string,
  batchId: string,
  attendanceDate: string,
) {
  const record = await TeacherAttendance.findOne({
    role,
    teacherId: new mongoose.Types.ObjectId(userId),
    batchId: new mongoose.Types.ObjectId(batchId),
    attendanceDate,
  });
  return record ? serializeTeacherAttendance(record) : null;
}

export async function markStaffAttendance(input: {
  role: StaffRole;
  userId: string;
  batchId: string;
  attendanceDate: string;
  status: TeacherAttendanceStatus;
  remarks: string;
}) {
  const dateErr = attendanceDateValidationError(input.attendanceDate);
  if (dateErr) {
    if (dateErr.includes("Previous")) throw new Error("PAST_DATE");
    if (dateErr.includes("Future")) throw new Error("FUTURE_DATE");
    throw new Error("INVALID_DATE");
  }

  const allowed = await staffCanAccessBatch(input.role, input.userId, input.batchId);
  if (!allowed) throw new Error("FORBIDDEN");

  const batch = await Batch.findById(input.batchId).select("batchName").lean();
  if (!batch) throw new Error("NOT_FOUND");

  const userName = await resolveStaffName(input.role, input.userId);
  const userOid = new mongoose.Types.ObjectId(input.userId);
  const batchOid = new mongoose.Types.ObjectId(input.batchId);
  const attendanceDate = todayDateString();

  const existing = await TeacherAttendance.findOne({
    role: input.role,
    teacherId: userOid,
    batchId: batchOid,
    attendanceDate,
  });

  if (existing) {
    return { duplicate: true as const, record: serializeTeacherAttendance(existing) };
  }

  try {
    const doc = await TeacherAttendance.create({
      teacherId: userOid,
      userName,
      role: input.role,
      batchId: batchOid,
      batchName: batch.batchName,
      attendanceDate,
      status: input.status,
      remarks: input.remarks,
      markedAt: new Date(),
    });
    return { duplicate: false as const, record: serializeTeacherAttendance(doc) };
  } catch (e) {
    if ((e as { code?: number }).code === 11000) {
      const dup = await TeacherAttendance.findOne({
        role: input.role,
        teacherId: userOid,
        batchId: batchOid,
        attendanceDate,
      });
      if (dup) return { duplicate: true as const, record: serializeTeacherAttendance(dup) };
    }
    throw e;
  }
}

export async function listStaffAttendanceHistory(
  role: StaffRole,
  userId: string,
  options?: { limit?: number; batchId?: string },
) {
  const limit = Math.min(100, Math.max(1, options?.limit ?? 30));
  const filter: Record<string, unknown> = {
    role,
    teacherId: new mongoose.Types.ObjectId(userId),
  };
  if (options?.batchId && mongoose.Types.ObjectId.isValid(options.batchId)) {
    filter.batchId = new mongoose.Types.ObjectId(options.batchId);
  }

  const records = await TeacherAttendance.find(filter)
    .sort({ attendanceDate: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return records.map(r => ({
    id: (r._id as mongoose.Types.ObjectId).toString(),
    userId: r.teacherId.toString(),
    userName: r.userName ?? "",
    role: r.role,
    batchId: r.batchId.toString(),
    batchName: r.batchName ?? "",
    attendanceStatus: r.status,
    attendanceDate: r.attendanceDate,
    remarks: r.remarks ?? "",
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : "",
  }));
}

export async function getStaffAttendanceStats(role: StaffRole, userId: string) {
  const match = {
    role,
    teacherId: new mongoose.Types.ObjectId(userId),
  };
  const [total, present, absent, halfDay] = await Promise.all([
    TeacherAttendance.countDocuments(match),
    TeacherAttendance.countDocuments({ ...match, status: "Present" }),
    TeacherAttendance.countDocuments({ ...match, status: "Absent" }),
    TeacherAttendance.countDocuments({ ...match, status: "Half Day" }),
  ]);
  const attendancePercentage =
    total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0;

  return { total, present, absent, halfDay, attendancePercentage };
}

export async function resolveStaffName(role: StaffRole, userId: string): Promise<string> {
  if (role === "teacher") {
    const t = await Teacher.findById(userId).select("fullName").lean();
    return t?.fullName ?? "Teacher";
  }
  const s = await SeniorTeacher.findById(userId).select("fullName").lean();
  return s?.fullName ?? "Senior Teacher";
}

export type StaffReportFilters = {
  role: StaffRole;
  from?: string;
  to?: string;
  batchId?: string;
  userId?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export async function buildStaffAttendanceReport(filters: StaffReportFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const match: Record<string, unknown> = { role: filters.role };
  if (filters.batchId && mongoose.Types.ObjectId.isValid(filters.batchId)) {
    match.batchId = new mongoose.Types.ObjectId(filters.batchId);
  }
  if (filters.userId && mongoose.Types.ObjectId.isValid(filters.userId)) {
    match.teacherId = new mongoose.Types.ObjectId(filters.userId);
  }
  if (filters.from || filters.to) {
    const dateFilter: Record<string, string> = {};
    if (filters.from) dateFilter.$gte = filters.from;
    if (filters.to) dateFilter.$lte = filters.to;
    match.attendanceDate = dateFilter;
  }

  const [records, total, present, absent, halfDay] = await Promise.all([
    TeacherAttendance.find(match).sort({ attendanceDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    TeacherAttendance.countDocuments(match),
    TeacherAttendance.countDocuments({ ...match, status: "Present" }),
    TeacherAttendance.countDocuments({ ...match, status: "Absent" }),
    TeacherAttendance.countDocuments({ ...match, status: "Half Day" }),
  ]);

  const userIds = [...new Set(records.map(r => r.teacherId.toString()))];
  const nameMap = new Map<string, string>();

  if (filters.role === "teacher") {
    const teachers = await Teacher.find({ _id: { $in: userIds } }).select("fullName").lean();
    teachers.forEach(t => nameMap.set((t._id as mongoose.Types.ObjectId).toString(), t.fullName));
  } else {
    const seniors = await SeniorTeacher.find({ _id: { $in: userIds } }).select("fullName").lean();
    seniors.forEach(s => nameMap.set((s._id as mongoose.Types.ObjectId).toString(), s.fullName));
  }

  let rows = records.map(r => {
    const uid = r.teacherId.toString();
    return {
      id: (r._id as mongoose.Types.ObjectId).toString(),
      userId: uid,
      staffName: nameMap.get(uid) ?? (filters.role === "teacher" ? "Teacher" : "Senior Teacher"),
      batchId: r.batchId.toString(),
      batchName: r.batchName || "",
      attendanceStatus: r.status,
      attendanceDate: r.attendanceDate,
      remarks: r.remarks ?? "",
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : "",
    };
  });

  const q = (filters.search || "").trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      row =>
        row.staffName.toLowerCase().includes(q) ||
        row.batchName.toLowerCase().includes(q) ||
        row.remarks.toLowerCase().includes(q),
    );
  }

  const attendancePercentage =
    total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0;

  return {
    summary: {
      total,
      present,
      absent,
      halfDay,
      attendancePercentage,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    records: rows,
  };
}
