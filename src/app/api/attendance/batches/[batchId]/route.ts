import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Batch from "@/lib/models/Batch";
import Attendance from "@/lib/models/Attendance";
import { requireBatchRead } from "@/lib/auth/require-batch-access";
import { teacherCanAccessBatch } from "@/lib/auth/require-batch-access";
import { seniorCanAccessBatch } from "@/lib/attendance/batchScope";
import { serializeAttendance } from "@/lib/serializers/attendanceSerialize";
import type { AttendanceDocument } from "@/lib/models/Attendance";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ batchId: string }> };

async function canReadBatch(
  access: { kind: string; seniorTeacherId?: string; teacherId?: string },
  batchId: string,
): Promise<boolean> {
  if (access.kind === "admin") return true;
  if (access.kind === "senior" && access.seniorTeacherId) {
    return seniorCanAccessBatch(access.seniorTeacherId, batchId);
  }
  if (access.kind === "teacher" && access.teacherId) {
    return teacherCanAccessBatch(access.teacherId, batchId);
  }
  return false;
}

/** Batch attendance history + per-student stats (senior, admin, assigned teacher). */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireBatchRead(request);
    if (!auth.ok) return auth.response;

    const { batchId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return NextResponse.json({ success: false, error: "Invalid batch id" }, { status: 400 });
    }

    await dbConnect();

    const allowed = await canReadBatch(auth.access, batchId);
    if (!allowed) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = (searchParams.get("from") || "").trim();
    const to = (searchParams.get("to") || "").trim();
    const studentId = (searchParams.get("studentId") || "").trim();

    const batch = await Batch.findById(batchId).lean();
    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    const match: Record<string, unknown> = { batchId: new mongoose.Types.ObjectId(batchId) };
    if (from || to) {
      const dateFilter: Record<string, string> = {};
      if (from) dateFilter.$gte = from;
      if (to) dateFilter.$lte = to;
      match.attendanceDate = dateFilter;
    }
    if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
      match.studentId = new mongoose.Types.ObjectId(studentId);
    }

    const records = await Attendance.find(match).sort({ attendanceDate: -1, createdAt: -1 }).lean();

    const byStudent = new Map<
      string,
      { present: number; absent: number; history: ReturnType<typeof serializeAttendance>[] }
    >();

    for (const r of records) {
      const sid = r.studentId.toString();
      if (!byStudent.has(sid)) byStudent.set(sid, { present: 0, absent: 0, history: [] });
      const row = byStudent.get(sid)!;
      if (r.status === "Present") row.present++;
      else row.absent++;
      row.history.push(serializeAttendance(r as unknown as AttendanceDocument));
    }

    const roster = (batch.students as { _id: mongoose.Types.ObjectId; studentName: string; studentEmail: string }[]).map(
      s => {
        const stats = byStudent.get(s._id.toString());
        const total = (stats?.present ?? 0) + (stats?.absent ?? 0);
        const percent = total === 0 ? 0 : Math.round(((stats?.present ?? 0) / total) * 100);
        return {
          studentId: s._id.toString(),
          studentName: s.studentName,
          studentEmail: s.studentEmail,
          present: stats?.present ?? 0,
          absent: stats?.absent ?? 0,
          percent,
          history: stats?.history ?? [],
        };
      },
    );

    const present = records.filter(r => r.status === "Present").length;
    const absent = records.filter(r => r.status === "Absent").length;
    const total = present + absent;

    return NextResponse.json({
      success: true,
      data: {
        batch: {
          id: batchId,
          batchName: batch.batchName,
          courseName: batch.courseName,
          attendanceSummary: batch.attendanceSummary,
        },
        summary: {
          present,
          absent,
          percent: total === 0 ? 0 : Math.round((present / total) * 100),
          sessions: new Set(records.map(r => r.attendanceDate)).size,
        },
        records: records.map(r => serializeAttendance(r as unknown as AttendanceDocument)),
        rosterStats: roster,
      },
    });
  } catch (e) {
    console.error("[attendance/batches GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load batch attendance" }, { status: 500 });
  }
}
