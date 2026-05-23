import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Batch from "@/lib/models/Batch";
import SeniorTeacher from "@/lib/models/SeniorTeacher";
import TeacherAttendance from "@/lib/models/TeacherAttendance";
import { requireSeniorTeacherFromRequest } from "@/lib/auth/require-senior-teacher";
import { seniorCanAccessBatch } from "@/lib/attendance/batchScope";
import { teacherAttendanceMarkSchema } from "@/lib/validators/teacherAttendance";
import { serializeTeacherAttendance } from "@/lib/serializers/teacherAttendanceSerialize";
import { resolveStaffName } from "@/lib/attendance/staffSelfAttendance";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSeniorTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    const { id: batchId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return NextResponse.json({ success: false, error: "Invalid batch id" }, { status: 400 });
    }

    await dbConnect();
    const allowed = await seniorCanAccessBatch(auth.seniorTeacher.id, batchId);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "This batch is not in your scope. Only batches you manage can be used for attendance." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const attendanceDate = (searchParams.get("date") || todayIso()).trim();

    const [batch, senior, record] = await Promise.all([
      Batch.findById(batchId).select("batchName courseName batchTiming batchDay batchTime"),
      SeniorTeacher.findById(auth.seniorTeacher.id).select("fullName email"),
      TeacherAttendance.findOne({
        role: "senior-teacher",
        teacherId: new mongoose.Types.ObjectId(auth.seniorTeacher.id),
        batchId: new mongoose.Types.ObjectId(batchId),
        attendanceDate,
      }),
    ]);

    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    const batchTiming = batch.batchTiming || `${batch.batchDay} · ${batch.batchTime}`;

    return NextResponse.json({
      success: true,
      data: {
        teacher: {
          id: auth.seniorTeacher.id,
          fullName: senior?.fullName ?? "Senior Teacher",
          email: senior?.email ?? "",
        },
        batch: {
          id: batchId,
          batchName: batch.batchName,
          courseName: batch.courseName,
          batchTiming,
        },
        attendanceDate,
        isToday: attendanceDate === todayIso(),
        alreadyMarked: !!record,
        record: record ? serializeTeacherAttendance(record) : null,
      },
    });
  } catch (e) {
    console.error("[senior-teacher/my-attendance GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load attendance" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSeniorTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    const { id: batchId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return NextResponse.json({ success: false, error: "Invalid batch id" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = teacherAttendanceMarkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => e.message).join("; ") },
        { status: 422 },
      );
    }

    await dbConnect();
    const allowed = await seniorCanAccessBatch(auth.seniorTeacher.id, batchId);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "This batch is not in your scope. Only batches you manage can be used for attendance." },
        { status: 403 },
      );
    }

    const attendanceDate = todayIso();
    const userOid = new mongoose.Types.ObjectId(auth.seniorTeacher.id);
    const batchOid = new mongoose.Types.ObjectId(batchId);

    const batch = await Batch.findById(batchId).select("batchName").lean();
    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    const existing = await TeacherAttendance.findOne({
      role: "senior-teacher",
      teacherId: userOid,
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

    const userName = await resolveStaffName("senior-teacher", auth.seniorTeacher.id);
    const doc = await TeacherAttendance.create({
      teacherId: userOid,
      userName,
      role: "senior-teacher",
      batchId: batchOid,
      batchName: batch.batchName,
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
    console.error("[senior-teacher/my-attendance POST]", e);
    return NextResponse.json({ success: false, error: "Failed to save attendance" }, { status: 500 });
  }
}
