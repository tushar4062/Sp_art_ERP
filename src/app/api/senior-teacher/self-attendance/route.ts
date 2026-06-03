import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireSeniorTeacherFromRequest } from "@/lib/auth/require-senior-teacher";
import { staffAttendanceMarkSchema } from "@/lib/validators/teacherAttendance";
import {
  getStaffAttendanceRecord,
  listAssignedBatchesForStaff,
  markStaffAttendance,
} from "@/lib/attendance/staffSelfAttendance";
import { PAST_DATE_MESSAGE } from "@/lib/leave/dateValidation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSeniorTeacherFromRequest(request);
    if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const batchId = (searchParams.get("batchId") || "").trim();
    const attendanceDate = (searchParams.get("date") || "").trim();

    if (batchId && attendanceDate) {
      const record = await getStaffAttendanceRecord(
        "senior-teacher",
        auth.seniorTeacher.id,
        batchId,
        attendanceDate,
      );
      return NextResponse.json({ success: true, data: { record } });
    }

    const batches = await listAssignedBatchesForStaff("senior-teacher", auth.seniorTeacher.id);
    return NextResponse.json({ success: true, data: { batches } });
  } catch (e) {
    console.error("[senior-teacher/self-attendance GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load attendance" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSeniorTeacherFromRequest(request);
    if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

    const body = await request.json();
    const parsed = staffAttendanceMarkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => e.message).join("; ") },
        { status: 422 },
      );
    }

    await dbConnect();
    const result = await markStaffAttendance({
      role: "senior-teacher",
      userId: auth.seniorTeacher.id,
      batchId: parsed.data.batchId,
      attendanceDate: parsed.data.attendanceDate,
      status: parsed.data.status,
      remarks: parsed.data.remarks ?? "",
    });

    if (result.duplicate) {
      return NextResponse.json(
        {
          success: false,
          error: "Attendance already submitted for this batch and date",
          data: { record: result.record, duplicate: true },
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Attendance saved successfully",
      data: { record: result.record },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "PAST_DATE") {
      return NextResponse.json({ success: false, error: PAST_DATE_MESSAGE }, { status: 422 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "You are not assigned to this batch" }, { status: 403 });
    }
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }
    console.error("[senior-teacher/self-attendance POST]", e);
    return NextResponse.json({ success: false, error: "Failed to save attendance" }, { status: 500 });
  }
}
