import mongoose from "mongoose";
import Batch from "@/lib/models/Batch";
import Attendance from "@/lib/models/Attendance";
import TeacherAttendance from "@/lib/models/TeacherAttendance";
import Teacher from "@/lib/models/Teacher";
import type { BatchAccess } from "@/lib/auth/require-batch-access";
import { getScopedBatchIds, seniorCanAccessBatch } from "@/lib/attendance/batchScope";
import { serializeTeacherAttendance } from "@/lib/serializers/teacherAttendanceSerialize";
import type { TeacherAttendanceDocument } from "@/lib/models/TeacherAttendance";

export function defaultReportFromDate() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export function reportTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

export type ReportQuery = {
  batchId: string;
  from: string;
  to: string;
  report: string;
  type: string;
};

export async function buildAttendanceReports(access: BatchAccess, query: ReportQuery) {
  const { batchId, from, to, report, type } = query;

  let batchFilter: Record<string, unknown> = {};
  if (access.kind === "senior" && access.seniorTeacherId) {
    const scoped = await getScopedBatchIds(access);
    if (!scoped?.length) {
      return {
        from,
        to,
        type,
        summary: { present: 0, absent: 0, percent: 0, sessions: 0, total: 0 },
        batches: [] as ReturnType<typeof mapBatchRows>,
        daily: [] as { date: string; present: number; absent: number }[],
        teacherRecords: [] as unknown[],
        studentHistory: [] as unknown[],
      };
    }
    batchFilter = { _id: { $in: scoped } };
  }

  if (batchId) {
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      throw new ReportError("Invalid batch id", 400);
    }
    if (access.kind === "senior" && access.seniorTeacherId) {
      const ok = await seniorCanAccessBatch(access.seniorTeacherId, batchId);
      if (!ok) throw new ReportError("Batch not in your scope", 403);
    }
    batchFilter = { _id: new mongoose.Types.ObjectId(batchId) };
  }

  const batches = await Batch.find(batchFilter)
    .select("batchName courseName attendanceSummary students batchTiming batchDay batchTime")
    .sort({ updatedAt: -1 })
    .lean();

  const batchIds = batches.map(b => b._id as mongoose.Types.ObjectId);
  const batchRows = mapBatchRows(batches);

  const emptyPayload = {
    from,
    to,
    type,
    summary: { present: 0, absent: 0, percent: 0, sessions: 0, total: 0 },
    batches: batchRows,
    daily: [] as { date: string; present: number; absent: number }[],
    teacherRecords: [] as unknown[],
    studentHistory: [] as unknown[],
  };

  if (!batchIds.length) return emptyPayload;

  const attendanceMatch = {
    batchId: { $in: batchIds },
    attendanceDate: { $gte: from, $lte: to },
  };

  if (type === "teacher") {
    const [statusAgg, dailyAgg, records] = await Promise.all([
      TeacherAttendance.aggregate<{ _id: string; count: number }>([
        { $match: attendanceMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      TeacherAttendance.aggregate<{ _id: string; present: number; absent: number }>([
        { $match: attendanceMatch },
        {
          $group: {
            _id: "$attendanceDate",
            present: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      TeacherAttendance.find(attendanceMatch).sort({ attendanceDate: -1, markedAt: -1 }).limit(500).lean(),
    ]);

    const present = statusAgg.find(s => s._id === "Present")?.count ?? 0;
    const absent = statusAgg.find(s => s._id === "Absent")?.count ?? 0;
    const total = present + absent;
    const percent = total === 0 ? 0 : Math.round((present / total) * 100);
    const sessions = new Set(dailyAgg.map(d => d._id)).size;

    const teacherIds = [...new Set(records.map(r => r.teacherId.toString()))];
    const teachers = await Teacher.find({ _id: { $in: teacherIds } })
      .select("fullName email")
      .lean();
    const teacherMap = new Map(teachers.map(t => [(t._id as mongoose.Types.ObjectId).toString(), t]));
    const batchMap = new Map(batchRows.map(b => [b.id, b]));

    const teacherRecords = records.map(r => {
      const tid = r.teacherId.toString();
      const bid = r.batchId.toString();
      const t = teacherMap.get(tid);
      const b = batchMap.get(bid);
      return {
        ...serializeTeacherAttendance(r as unknown as TeacherAttendanceDocument),
        teacherName: t?.fullName ?? "Teacher",
        teacherEmail: t?.email ?? "",
        batchName: b?.batchName ?? "",
      };
    });

    return {
      from,
      to,
      type,
      summary: { present, absent, percent, sessions, total },
      batches: batchRows,
      daily: dailyAgg.map(d => ({ date: d._id, present: d.present, absent: d.absent })),
      teacherRecords,
      studentHistory: [],
    };
  }

  const [statusAgg, dailyAgg, records] = await Promise.all([
    Attendance.aggregate<{ _id: string; count: number }>([
      { $match: attendanceMatch },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Attendance.aggregate<{ _id: string; present: number; absent: number }>([
      { $match: attendanceMatch },
      {
        $group: {
          _id: "$attendanceDate",
          present: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    report === "students"
      ? Attendance.find(attendanceMatch).sort({ attendanceDate: -1 }).limit(500).lean()
      : Promise.resolve([]),
  ]);

  const present = statusAgg.find(s => s._id === "Present")?.count ?? 0;
  const absent = statusAgg.find(s => s._id === "Absent")?.count ?? 0;
  const total = present + absent;
  const percent = total === 0 ? 0 : Math.round((present / total) * 100);
  const sessions = new Set(dailyAgg.map(d => d._id)).size;

  const studentHistory =
    report === "students" && records.length
      ? records.map(r => ({
          studentId: r.studentId.toString(),
          batchId: r.batchId.toString(),
          attendanceDate: r.attendanceDate,
          status: r.status,
          remarks: r.remarks ?? "",
        }))
      : [];

  return {
    from,
    to,
    type: "student",
    summary: { present, absent, percent, sessions, total },
    batches: batchRows,
    daily: dailyAgg.map(d => ({ date: d._id, present: d.present, absent: d.absent })),
    teacherRecords: [],
    studentHistory,
  };
}

function mapBatchRows(
  batches: {
    _id: mongoose.Types.ObjectId;
    batchName: string;
    courseName: string;
    batchTiming?: string;
    batchDay: string;
    batchTime: string;
    students: unknown[];
    attendanceSummary: unknown;
  }[],
) {
  return batches.map(b => ({
    id: b._id.toString(),
    batchName: b.batchName,
    courseName: b.courseName,
    batchTiming: b.batchTiming || `${b.batchDay} · ${b.batchTime}`,
    totalStudents: (b.students as unknown[]).length,
    attendanceSummary: b.attendanceSummary,
  }));
}

export class ReportError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
