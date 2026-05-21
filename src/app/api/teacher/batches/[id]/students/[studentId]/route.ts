import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Batch from "@/lib/models/Batch";
import Attendance from "@/lib/models/Attendance";
import { requireTeacherFromRequest } from "@/lib/auth/require-teacher";
import { teacherCanAccessBatch } from "@/lib/auth/require-batch-access";
import { recomputeBatchAttendanceSummary } from "@/lib/attendance/recomputeBatchSummary";
import { serializeBatch } from "@/lib/serializers/batchSerialize";
import type { BatchDocument } from "@/lib/models/Batch";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; studentId: string }> };

/** Remove student from batch roster only — does not delete from students collection. */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    const { id: batchId, studentId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(batchId) || !mongoose.Types.ObjectId.isValid(studentId)) {
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
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    const before = batch.students.length;
    batch.students = batch.students.filter(s => s._id.toString() !== studentId);
    if (batch.students.length === before) {
      return NextResponse.json({ success: false, error: "Student not in this batch" }, { status: 404 });
    }

    await batch.save();

    await Attendance.deleteMany({
      batchId: new mongoose.Types.ObjectId(batchId),
      studentId: new mongoose.Types.ObjectId(studentId),
    });
    await recomputeBatchAttendanceSummary(batchId);

    const populated = await Batch.findById(batchId).populate("teacherIds", "fullName email");
    return NextResponse.json({
      success: true,
      data: { batch: serializeBatch(populated as BatchDocument) },
      message: "Student removed from batch",
    });
  } catch (e) {
    console.error("[teacher/batches student DELETE]", e);
    return NextResponse.json({ success: false, error: "Failed to remove student" }, { status: 500 });
  }
}
