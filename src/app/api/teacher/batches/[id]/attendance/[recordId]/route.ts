import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Attendance from "@/lib/models/Attendance";
import { requireTeacherFromRequest } from "@/lib/auth/require-teacher";
import { teacherCanAccessBatch } from "@/lib/auth/require-batch-access";
import { attendanceUpdateSchema } from "@/lib/validators/attendance";
import { serializeAttendance } from "@/lib/serializers/attendanceSerialize";
import Batch from "@/lib/models/Batch";
import { recomputeBatchAttendanceSummary } from "@/lib/attendance/recomputeBatchSummary";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; recordId: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    const { id: batchId, recordId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(batchId) || !mongoose.Types.ObjectId.isValid(recordId)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    await dbConnect();

    const allowed = await teacherCanAccessBatch(auth.teacher.id, batchId);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "You are not assigned to this batch" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = attendanceUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ") },
        { status: 422 },
      );
    }

    const doc = await Attendance.findOne({
      _id: new mongoose.Types.ObjectId(recordId),
      batchId: new mongoose.Types.ObjectId(batchId),
    });

    if (!doc) {
      return NextResponse.json({ success: false, error: "Attendance record not found" }, { status: 404 });
    }

    if (parsed.data.status) doc.status = parsed.data.status;
    if (parsed.data.remarks !== undefined) doc.remarks = parsed.data.remarks;
    doc.teacherId = new mongoose.Types.ObjectId(auth.teacher.id);
    doc.markedBy = new mongoose.Types.ObjectId(auth.teacher.id);
    await doc.save();

    await recomputeBatchAttendanceSummary(batchId);
    const batch = await Batch.findById(batchId).select("attendanceSummary").lean();

    return NextResponse.json({
      success: true,
      data: { record: serializeAttendance(doc), attendanceSummary: batch?.attendanceSummary },
      message: "Attendance updated",
    });
  } catch (e) {
    console.error("[teacher/batches attendance PUT]", e);
    return NextResponse.json({ success: false, error: "Failed to update attendance" }, { status: 500 });
  }
}
