import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Batch from "@/lib/models/Batch";
import Teacher from "@/lib/models/Teacher";
import TeacherAttendance from "@/lib/models/TeacherAttendance";
import { requireTeacherFromRequest } from "@/lib/auth/require-teacher";
import { teacherCanAccessBatch } from "@/lib/auth/require-batch-access";
import { teacherAttendanceMarkSchema } from "@/lib/validators/teacherAttendance";
import { serializeTeacherAttendance } from "@/lib/serializers/teacherAttendanceSerialize";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** GET today's (or ?date=) own attendance for this batch */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    const { id: batchId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return NextResponse.json({ success: false, error: "Invalid batch id" }, { status: 400 });
    }

    await dbConnect();
    const allowed = await teacherCanAccessBatch(auth.teacher.id, batchId);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "You are not assigned to this batch" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const attendanceDate = (searchParams.get("date") || todayIso()).trim();

    const [batch, teacher, record] = await Promise.all([
      Batch.findById(batchId).select("batchName courseName batchTiming batchDay batchTime"),
      Teacher.findById(auth.teacher.id).select("fullName email"),
      TeacherAttendance.findOne({
        teacherId: new mongoose.Types.ObjectId(auth.teacher.id),
        batchId: new mongoose.Types.ObjectId(batchId),
        attendanceDate,
      }),
    ]);

    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    const batchTiming = batch.batchTiming || `${batch.batchDay} · ${batch.batchTime}`;
    const isToday = attendanceDate === todayIso();

    return NextResponse.json({
      success: true,
      data: {
        teacher: {
          id: auth.teacher.id,
          fullName: teacher?.fullName ?? "Teacher",
          email: teacher?.email ?? "",
        },
        batch: {
          id: batchId,
          batchName: batch.batchName,
          courseName: batch.courseName,
          batchTiming,
        },
        attendanceDate,
        isToday,
        alreadyMarked: !!record,
        record: record ? serializeTeacherAttendance(record) : null,
      },
    });
  } catch (e) {
    console.error("[teacher/my-attendance GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load attendance" }, { status: 500 });
  }
}

/** Mark own attendance once per day per batch (today only) */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    const { id: batchId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return NextResponse.json({ success: false, error: "Invalid batch id" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = teacherAttendanceMarkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ") },
        { status: 422 },
      );
    }

    await dbConnect();
    const allowed = await teacherCanAccessBatch(auth.teacher.id, batchId);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "You are not assigned to this batch" },
        { status: 403 },
      );
    }

    const attendanceDate = todayIso();
    const teacherOid = new mongoose.Types.ObjectId(auth.teacher.id);
    const batchOid = new mongoose.Types.ObjectId(batchId);

    const existing = await TeacherAttendance.findOne({
      teacherId: teacherOid,
      batchId: batchOid,
      attendanceDate,
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Attendance already marked for today",
          data: { record: serializeTeacherAttendance(existing), alreadyMarked: true },
        },
        { status: 409 },
      );
    }

    const doc = await TeacherAttendance.create({
      teacherId: teacherOid,
      batchId: batchOid,
      attendanceDate,
      status: parsed.data.status,
      remarks: parsed.data.remarks ?? "",
      markedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: { record: serializeTeacherAttendance(doc), alreadyMarked: true },
      message: "Your attendance has been saved",
    });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) {
      return NextResponse.json(
        { success: false, error: "Attendance already marked for today" },
        { status: 409 },
      );
    }
    console.error("[teacher/my-attendance POST]", e);
    return NextResponse.json({ success: false, error: "Failed to save attendance" }, { status: 500 });
  }
}
