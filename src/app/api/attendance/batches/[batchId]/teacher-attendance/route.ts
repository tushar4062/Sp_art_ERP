import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Batch from "@/lib/models/Batch";
import Teacher from "@/lib/models/Teacher";
import TeacherAttendance from "@/lib/models/TeacherAttendance";
import { requireBatchRead } from "@/lib/auth/require-batch-access";
import { teacherCanAccessBatch } from "@/lib/auth/require-batch-access";
import { seniorCanAccessBatch } from "@/lib/attendance/batchScope";
import { serializeTeacherAttendance } from "@/lib/serializers/teacherAttendanceSerialize";
import type { TeacherAttendanceDocument } from "@/lib/models/TeacherAttendance";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ batchId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireBatchRead(request);
    if (!auth.ok) return auth.response;

    const { batchId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return NextResponse.json({ success: false, error: "Invalid batch id" }, { status: 400 });
    }

    await dbConnect();

    if (auth.access.kind === "teacher" && auth.access.teacherId) {
      const ok = await teacherCanAccessBatch(auth.access.teacherId, batchId);
      if (!ok) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    } else if (auth.access.kind === "senior" && auth.access.seniorTeacherId) {
      const ok = await seniorCanAccessBatch(auth.access.seniorTeacherId, batchId);
      if (!ok) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = (searchParams.get("from") || "").trim();
    const to = (searchParams.get("to") || "").trim();

    const match: Record<string, unknown> = { batchId: new mongoose.Types.ObjectId(batchId) };
    if (from || to) {
      const dateFilter: Record<string, string> = {};
      if (from) dateFilter.$gte = from;
      if (to) dateFilter.$lte = to;
      match.attendanceDate = dateFilter;
    }

    const [batch, records] = await Promise.all([
      Batch.findById(batchId).select("batchName courseName").lean(),
      TeacherAttendance.find(match).sort({ attendanceDate: -1, markedAt: -1 }).lean(),
    ]);

    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    const teacherIds = [...new Set(records.map(r => r.teacherId.toString()))];
    const teachers = await Teacher.find({ _id: { $in: teacherIds } })
      .select("fullName email")
      .lean();
    const teacherMap = new Map(teachers.map(t => [(t._id as mongoose.Types.ObjectId).toString(), t]));

    const rows = records.map(r => {
      const tid = r.teacherId.toString();
      const t = teacherMap.get(tid);
      return {
        ...serializeTeacherAttendance(r as unknown as TeacherAttendanceDocument),
        teacherName: t?.fullName ?? "Teacher",
        teacherEmail: t?.email ?? "",
      };
    });

    const present = records.filter(r => r.status === "Present").length;
    const absent = records.filter(r => r.status === "Absent").length;
    const total = present + absent;

    return NextResponse.json({
      success: true,
      data: {
        batch: { id: batchId, batchName: batch.batchName, courseName: batch.courseName },
        summary: {
          present,
          absent,
          percent: total === 0 ? 0 : Math.round((present / total) * 100),
          sessions: new Set(records.map(r => r.attendanceDate)).size,
        },
        records: rows,
      },
    });
  } catch (e) {
    console.error("[batch teacher-attendance GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load teacher attendance" }, { status: 500 });
  }
}
