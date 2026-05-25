import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import BatchModel from "@/lib/models/Batch";
import AttendanceModel from "@/lib/models/Attendance";
import TeacherStudentAttendanceModel, {
  type AttendanceStudent,
} from "@/lib/models/TeacherStudentAttendance";
import StudentModel from "@/lib/models/Student";
import type { BatchDocument } from "@/lib/models/Batch";
import { STUDENT_SESSION_COOKIE } from "@/lib/auth/portal-session";
import { attendanceDateFromDoc, currentMonthString, monthDateBounds } from "@/lib/dates/attendanceDate";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const studentId = req.cookies.get(STUDENT_SESSION_COOKIE)?.value;
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const month = url.searchParams.get("month") || currentMonthString();
    const bounds = monthDateBounds(month);
    if (!bounds) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    let objectStudentId = new mongoose.Types.ObjectId(studentId);
    let student = await StudentModel.findById(objectStudentId).select("email fullName").lean();
    const emailParam = url.searchParams.get("email")?.toLowerCase().trim() || null;

    if (!student && emailParam && process.env.NODE_ENV !== "production") {
      const found = await StudentModel.findOne({ email: emailParam }).select("_id email fullName").lean();
      if (found?._id) {
        objectStudentId = new mongoose.Types.ObjectId(found._id.toString());
        student = found;
      }
    }

    const studentEmail = student?.email?.toLowerCase() || emailParam || "";

    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const orClauses: Record<string, unknown>[] = [{ "students.studentId": objectStudentId }];
    if (studentEmail) {
      orClauses.push({
        "students.studentEmail": { $regex: `^${escapeRegex(studentEmail)}$`, $options: "i" },
      });
    }

    const batchOrClauses = [...orClauses, { "students.studentId": objectStudentId.toString() }];
    let allocatedBatches = await BatchModel.find({ $or: batchOrClauses })
      .select("batchName courseName batchTiming batchDay batchTime _id students")
      .lean();

    const seenIds = new Set<string>();
    allocatedBatches = allocatedBatches.filter((batch: BatchDocument) => {
      const batchId = (batch._id as mongoose.Types.ObjectId).toString();
      if (seenIds.has(batchId)) return false;
      seenIds.add(batchId);
      return true;
    });

    const batchIds = allocatedBatches.map(b => (b._id as mongoose.Types.ObjectId));

    const [legacyRows, perStudentRows] = await Promise.all([
      TeacherStudentAttendanceModel.find({
        batchId: { $in: batchIds },
        $or: [
          { attendanceDate: { $gte: bounds.start, $lte: bounds.end } },
          { attendanceDate: { $exists: false } },
          { attendanceDate: null },
          { attendanceDate: "" },
        ],
      })
        .select("date attendanceDate batchId batchName courseName students")
        .lean(),
      AttendanceModel.find({
        studentId: objectStudentId,
        batchId: { $in: batchIds },
        attendanceDate: { $gte: bounds.start, $lte: bounds.end },
      })
        .select("attendanceDate batchId status remarks")
        .lean(),
    ]);

    const studentEmailLower = studentEmail.toLowerCase();
    const studentAttendance: Array<{
      date: string;
      batchId: string | null;
      batchName: string;
      courseName: string;
      studentName: string;
      status: string;
      remark: string;
    }> = [];

    for (const record of legacyRows) {
      const dateStr = attendanceDateFromDoc(record);
      if (!dateStr || dateStr < bounds.start || dateStr > bounds.end) continue;

      const found = ((record.students as AttendanceStudent[]) || []).find(
        (s: AttendanceStudent) => s.studentEmail?.toLowerCase?.() === studentEmailLower,
      );
      if (!found) continue;

      studentAttendance.push({
        date: dateStr,
        batchId: record.batchId?.toString?.() ?? null,
        batchName: record.batchName,
        courseName: record.courseName,
        studentName: found.studentName || student?.fullName || "Student",
        status: found.status || "Absent",
        remark: found.remark || "",
      });
    }

    const batchNameById = new Map(
      allocatedBatches.map(b => [(b._id as mongoose.Types.ObjectId).toString(), b.batchName]),
    );
    const courseById = new Map(
      allocatedBatches.map(b => [(b._id as mongoose.Types.ObjectId).toString(), b.courseName]),
    );

    for (const row of perStudentRows) {
      const bid = row.batchId.toString();
      studentAttendance.push({
        date: row.attendanceDate,
        batchId: bid,
        batchName: batchNameById.get(bid) || "Batch",
        courseName: courseById.get(bid) || "",
        studentName: student?.fullName || "Student",
        status: row.status,
        remark: row.remarks ?? "",
      });
    }

    const deduped = new Map<string, (typeof studentAttendance)[number]>();
    for (const row of studentAttendance) {
      const key = `${row.batchId ?? ""}:${row.date}`;
      if (!deduped.has(key)) deduped.set(key, row);
    }
    const records = [...deduped.values()].sort((a, b) => (a.date < b.date ? -1 : 1));

    const allocatedBatchRecords = allocatedBatches.map(batch => ({
      batchId: batch._id?.toString?.() ?? null,
      batchName: batch.batchName,
      courseName: batch.courseName,
      batchTiming: batch.batchTiming || "",
      batchDay: batch.batchDay,
      batchTime: batch.batchTime,
    }));

    const present = records.filter(r => r.status === "Present").length;
    const absent = records.filter(r => r.status === "Absent").length;
    const total = records.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return NextResponse.json(
      {
        success: true,
        records,
        summary: { present, absent, total, percentage },
        allocatedBatches: allocatedBatchRecords,
        month,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching student attendance report:", error);
    return NextResponse.json({ error: "Failed to fetch student attendance" }, { status: 500 });
  }
}
