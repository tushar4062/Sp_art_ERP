import mongoose from "mongoose";
import Batch from "@/lib/models/Batch";
import Teacher from "@/lib/models/Teacher";
import SeniorTeacher from "@/lib/models/SeniorTeacher";
import TeacherAttendance, {
  type StaffAttendanceRole,
  type TeacherAttendanceStatus,
} from "@/lib/models/TeacherAttendance";
import { serializeTeacherAttendance } from "@/lib/serializers/teacherAttendanceSerialize";
import { isDateBeforeToday } from "@/lib/leave/dateValidation";
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
  if (isDateBeforeToday(input.attendanceDate)) {
    throw new Error("PAST_DATE");
  }

  const allowed = await staffCanAccessBatch(input.role, input.userId, input.batchId);
  if (!allowed) throw new Error("FORBIDDEN");

  const batch = await Batch.findById(input.batchId).select("batchName").lean();
  if (!batch) throw new Error("NOT_FOUND");

  const userOid = new mongoose.Types.ObjectId(input.userId);
  const batchOid = new mongoose.Types.ObjectId(input.batchId);

  const existing = await TeacherAttendance.findOne({
    role: input.role,
    teacherId: userOid,
    batchId: batchOid,
    attendanceDate: input.attendanceDate,
  });

  if (existing) {
    return { duplicate: true as const, record: serializeTeacherAttendance(existing) };
  }

  try {
    const doc = await TeacherAttendance.create({
      teacherId: userOid,
      role: input.role,
      batchId: batchOid,
      batchName: batch.batchName,
      attendanceDate: input.attendanceDate,
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
        attendanceDate: input.attendanceDate,
      });
      if (dup) return { duplicate: true as const, record: serializeTeacherAttendance(dup) };
    }
    throw e;
  }
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

  return {
    summary: {
      total,
      present,
      absent,
      halfDay,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    records: rows,
  };
}

export type StaffListRow = {
  id: string;
  userId: string;
  batchId: string;
  staffName: string;
  batchName: string;
  remarks: string;
};

/** One row per staff + batch (for admin list with Preview). */
export async function buildStaffAttendanceGroupedList(filters: StaffReportFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));

  const match: Record<string, unknown> = { role: filters.role };
  if (filters.batchId && mongoose.Types.ObjectId.isValid(filters.batchId)) {
    match.batchId = new mongoose.Types.ObjectId(filters.batchId);
  }
  if (filters.userId && mongoose.Types.ObjectId.isValid(filters.userId)) {
    match.teacherId = new mongoose.Types.ObjectId(filters.userId);
  }

  const grouped = await TeacherAttendance.aggregate<{
    _id: { teacherId: mongoose.Types.ObjectId; batchId: mongoose.Types.ObjectId };
    batchName: string;
    remarks: string;
    recordId: mongoose.Types.ObjectId;
  }>([
    { $match: match },
    { $sort: { attendanceDate: -1, createdAt: -1 } },
    {
      $group: {
        _id: { teacherId: "$teacherId", batchId: "$batchId" },
        batchName: { $first: "$batchName" },
        remarks: { $first: "$remarks" },
        recordId: { $first: "$_id" },
      },
    },
    { $sort: { batchName: 1 } },
  ]);

  const userIds = [...new Set(grouped.map(g => g._id.teacherId.toString()))];
  const nameMap = new Map<string, string>();

  if (filters.role === "teacher") {
    const teachers = await Teacher.find({ _id: { $in: userIds } }).select("fullName").lean();
    teachers.forEach(t => nameMap.set((t._id as mongoose.Types.ObjectId).toString(), t.fullName));
  } else {
    const seniors = await SeniorTeacher.find({ _id: { $in: userIds } }).select("fullName").lean();
    seniors.forEach(s => nameMap.set((s._id as mongoose.Types.ObjectId).toString(), s.fullName));
  }

  let rows: StaffListRow[] = grouped.map(g => {
    const userId = g._id.teacherId.toString();
    const batchId = g._id.batchId.toString();
    return {
      id: `${userId}_${batchId}`,
      userId,
      batchId,
      staffName: nameMap.get(userId) ?? (filters.role === "teacher" ? "Teacher" : "Senior Teacher"),
      batchName: g.batchName || "",
      remarks: g.remarks ?? "",
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

  const total = rows.length;
  const skip = (page - 1) * limit;
  const pageRows = rows.slice(skip, skip + limit);

  return {
    summary: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    records: pageRows,
  };
}

export function parseStaffPreviewId(id: string): { userId: string; batchId: string } | null {
  const parts = decodeURIComponent(id).split("_");
  if (parts.length !== 2) return null;
  const [userId, batchId] = parts;
  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(batchId)) {
    return null;
  }
  return { userId, batchId };
}

export async function resolveStaffPreviewFromRecordId(recordId: string) {
  if (!mongoose.Types.ObjectId.isValid(recordId)) return null;
  const row = await TeacherAttendance.findById(recordId).lean();
  if (!row) return null;
  return {
    userId: row.teacherId.toString(),
    batchId: row.batchId.toString(),
    role: row.role as StaffRole,
  };
}

export async function buildStaffAttendancePreview(input: {
  role: StaffRole;
  userId: string;
  batchId: string;
  month: string;
}) {
  const { role, userId, batchId, month } = input;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("INVALID_MONTH");
  }

  const [year, mo] = month.split("-").map(Number);
  const start = `${month}-01`;
  const endDay = new Date(year, mo, 0).getDate();
  const end = `${month}-${String(endDay).padStart(2, "0")}`;

  const match = {
    role,
    teacherId: new mongoose.Types.ObjectId(userId),
    batchId: new mongoose.Types.ObjectId(batchId),
    attendanceDate: { $gte: start, $lte: end },
  };

  const [records, batch, staffProfile] = await Promise.all([
    TeacherAttendance.find(match).sort({ attendanceDate: 1 }).lean(),
    Batch.findById(batchId).select("batchName courseName batchDay batchTime").lean(),
    role === "teacher"
      ? Teacher.findById(userId).select("fullName email").lean()
      : SeniorTeacher.findById(userId).select("fullName email").lean(),
  ]);

  if (!batch) throw new Error("NOT_FOUND");

  const present = records.filter(r => r.status === "Present").length;
  const absent = records.filter(r => r.status === "Absent").length;
  const halfDay = records.filter(r => r.status === "Half Day").length;
  const total = records.length;
  const attendancePercentage =
    total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0;

  const name =
    staffProfile && "fullName" in staffProfile
      ? staffProfile.fullName
      : role === "teacher"
        ? "Teacher"
        : "Senior Teacher";
  const email = staffProfile && "email" in staffProfile ? staffProfile.email : "";

  return {
    staff: {
      userId,
      name,
      email,
      role,
    },
    batch: {
      id: batchId,
      name: batch.batchName,
      course: batch.courseName || "—",
      schedule: batch.batchTiming || `${batch.batchDay} · ${batch.batchTime}`,
    },
    month,
    summary: {
      present,
      absent,
      halfDay,
      total,
      attendancePercentage,
    },
    records: records.map(r => ({
      date: r.attendanceDate,
      status: r.status as TeacherAttendanceStatus,
      remarks: r.remarks ?? "",
    })),
  };
}
