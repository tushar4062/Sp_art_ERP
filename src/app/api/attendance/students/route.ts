import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Attendance from "@/lib/models/Attendance";
import Batch from "@/lib/models/Batch";
import { requireBatchRead } from "@/lib/auth/require-batch-access";
import { teacherCanAccessBatch } from "@/lib/auth/require-batch-access";
import { seniorCanAccessBatch } from "@/lib/attendance/batchScope";
import { serializeAttendance } from "@/lib/serializers/attendanceSerialize";
import type { AttendanceDocument } from "@/lib/models/Attendance";

export const runtime = "nodejs";

/** Student-wise attendance history within a batch. */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireBatchRead(request);
      if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

    const { searchParams } = new URL(request.url);
    const batchId = (searchParams.get("batchId") || "").trim();
    const studentId = (searchParams.get("studentId") || "").trim();

    if (!batchId || !studentId || !mongoose.Types.ObjectId.isValid(batchId) || !mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ success: false, error: "batchId and studentId required" }, { status: 400 });
    }

    await dbConnect();

    if (auth.access.kind === "teacher" && auth.access.teacherId) {
      const ok = await teacherCanAccessBatch(auth.access.teacherId, batchId);
      if (!ok) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    } else if (auth.access.kind === "senior" && auth.access.seniorTeacherId) {
      const ok = await seniorCanAccessBatch(auth.access.seniorTeacherId, batchId);
      if (!ok) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const batch = await Batch.findById(batchId).lean();
    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    const inRoster = (batch.students as { _id: mongoose.Types.ObjectId }[]).some(s => s._id.toString() === studentId);
    if (!inRoster) {
      return NextResponse.json({ success: false, error: "Student not in batch" }, { status: 404 });
    }

    const records = await Attendance.find({
      batchId: new mongoose.Types.ObjectId(batchId),
      studentId: new mongoose.Types.ObjectId(studentId),
    })
      .sort({ attendanceDate: -1 })
      .lean();

    const present = records.filter(r => r.status === "Present").length;
    const absent = records.filter(r => r.status === "Absent").length;
    const total = present + absent;

    return NextResponse.json({
      success: true,
      data: {
        studentId,
        batchId,
        summary: { present, absent, percent: total === 0 ? 0 : Math.round((present / total) * 100) },
        history: records.map(r => serializeAttendance(r as unknown as AttendanceDocument)),
      },
    });
  } catch (e) {
    console.error("[attendance/students GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load student attendance" }, { status: 500 });
  }
}
