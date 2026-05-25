import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Batch from "@/lib/models/Batch";
import Attendance from "@/lib/models/Attendance";
import { requireTeacherFromRequest } from "@/lib/auth/require-teacher";
import { teacherCanAccessBatch } from "@/lib/auth/require-batch-access";
import { attendanceBulkSchema } from "@/lib/validators/attendance";
import { serializeAttendance } from "@/lib/serializers/attendanceSerialize";
import { recomputeBatchAttendanceSummary } from "@/lib/attendance/recomputeBatchSummary";
import { loadPhotosByEmail } from "@/lib/attendance/rosterPhotos";
import { todayDateString } from "@/lib/dates/attendanceDate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function assertTeacherBatch(teacherId: string, batchId: string) {
  if (!mongoose.Types.ObjectId.isValid(batchId)) {
    return { ok: false as const, status: 400, error: "Invalid batch id" };
  }
  const allowed = await teacherCanAccessBatch(teacherId, batchId);
  if (!allowed) {
    return { ok: false as const, status: 403, error: "You are not assigned to this batch" };
  }
  return { ok: true as const };
}

/** GET batch roster merged with attendance for a date */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    const { id: batchId } = await context.params;
    await dbConnect();
    const gate = await assertTeacherBatch(auth.teacher.id, batchId);
    if (!gate.ok) {
      return NextResponse.json({ success: false, error: gate.error }, { status: gate.status });
    }

    const { searchParams } = new URL(request.url);
    const attendanceDate = (searchParams.get("date") || todayDateString()).trim();
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const statusFilter = (searchParams.get("status") || "All").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = 10;

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    const batchOid = new mongoose.Types.ObjectId(batchId);
    const records = await Attendance.find({ batchId: batchOid, attendanceDate }).lean();
    const byStudent = new Map(records.map(r => [r.studentId.toString(), r]));

    const emails = batch.students.map(s => s.studentEmail).filter(Boolean);
    const photos = await loadPhotosByEmail(emails);

    let roster = batch.students.map(s => {
      const sid = s._id.toString();
      const rec = byStudent.get(sid);
      return {
        id: sid,
        studentName: s.studentName,
        studentEmail: s.studentEmail,
        phone: s.phone,
        photo: photos[s.studentEmail?.trim().toLowerCase() ?? ""] ?? "",
        attendance: rec
          ? serializeAttendance(rec as unknown as import("@/lib/models/Attendance").AttendanceDocument)
          : null,
        status: rec?.status ?? null,
        remarks: rec?.remarks ?? "",
      };
    });

    if (search) {
      roster = roster.filter(
        s =>
          s.studentName.toLowerCase().includes(search) ||
          s.studentEmail.toLowerCase().includes(search),
      );
    }
    if (statusFilter === "Present" || statusFilter === "Absent") {
      roster = roster.filter(s => s.status === statusFilter);
    } else if (statusFilter === "Unmarked") {
      roster = roster.filter(s => !s.status);
    }

    const total = roster.length;
    const skip = (page - 1) * limit;
    const pageRows = roster.slice(skip, skip + limit);

    const present = records.filter(r => r.status === "Present").length;
    const absent = records.filter(r => r.status === "Absent").length;

    return NextResponse.json({
      success: true,
      data: {
        attendanceDate,
        batch: {
          id: batchId,
          batchName: batch.batchName,
          courseName: batch.courseName,
          batchTiming: batch.batchTiming || `${batch.batchDay} · ${batch.batchTime}`,
          totalStudents: batch.students.length,
          attendanceSummary: batch.attendanceSummary,
        },
        roster: pageRows,
        daySummary: { present, absent, totalMarked: records.length },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
    });
  } catch (e) {
    console.error("[teacher/batches/[id]/attendance GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load attendance" }, { status: 500 });
  }
}

/** POST bulk mark / update attendance for a date */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    const { id: batchId } = await context.params;
    await dbConnect();
    const gate = await assertTeacherBatch(auth.teacher.id, batchId);
    if (!gate.ok) {
      return NextResponse.json({ success: false, error: gate.error }, { status: gate.status });
    }

    const body = await request.json();
    const parsed = attendanceBulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ") },
        { status: 422 },
      );
    }

    const { attendanceDate, entries } = parsed.data;

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    const validStudentIds = new Set(batch.students.map(s => s._id.toString()));
    const teacherOid = new mongoose.Types.ObjectId(auth.teacher.id);
    const batchOid = new mongoose.Types.ObjectId(batchId);
    const saved = [];

    for (const entry of entries) {
      if (!mongoose.Types.ObjectId.isValid(entry.studentId) || !validStudentIds.has(entry.studentId)) {
        continue;
      }
      const doc = await Attendance.findOneAndUpdate(
        {
          batchId: batchOid,
          studentId: new mongoose.Types.ObjectId(entry.studentId),
          attendanceDate,
        },
        {
          $set: {
            status: entry.status,
            remarks: entry.remarks ?? "",
            teacherId: teacherOid,
            markedBy: teacherOid,
          },
        },
        { upsert: true, new: true },
      );
      saved.push(serializeAttendance(doc));
    }

    await recomputeBatchAttendanceSummary(batchId);
    const updated = await Batch.findById(batchId).select("attendanceSummary").lean();

    return NextResponse.json({
      success: true,
      data: { records: saved, attendanceSummary: updated?.attendanceSummary },
      message: `Attendance saved for ${saved.length} student(s)`,
    });
  } catch (e) {
    console.error("[teacher/batches/[id]/attendance POST]", e);
    return NextResponse.json({ success: false, error: "Failed to save attendance" }, { status: 500 });
  }
}
