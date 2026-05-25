import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import BatchModel from "@/lib/models/Batch";
import TeacherStudentAttendanceModel from "@/lib/models/TeacherStudentAttendance";
import { TEACHER_SESSION_COOKIE } from "@/lib/auth/portal-session";
import { attendanceDateFromDoc, monthDateBounds } from "@/lib/dates/attendanceDate";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const teacherId = req.cookies.get(TEACHER_SESSION_COOKIE)?.value;
    if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get("batchId");
    const studentId = searchParams.get("studentId");
    const month = searchParams.get("month");

    if (!batchId || !studentId || !month) {
      return NextResponse.json({ error: "Missing batchId, studentId or month" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(batchId) || !mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ error: "Invalid batch or student ID" }, { status: 400 });
    }

    const bounds = monthDateBounds(month);
    if (!bounds) {
      return NextResponse.json({ error: "Invalid month format" }, { status: 400 });
    }

    const objectBatchId = new mongoose.Types.ObjectId(batchId);
    const objectTeacherId = new mongoose.Types.ObjectId(teacherId);
    const objectStudentId = new mongoose.Types.ObjectId(studentId);

    const batch = await BatchModel.findOne({
      _id: objectBatchId,
      teacherIds: { $in: [objectTeacherId] },
    })
      .select("_id")
      .lean();

    if (!batch) {
      return NextResponse.json({ error: "Batch not found or access denied" }, { status: 404 });
    }

    const attendanceRecords = await TeacherStudentAttendanceModel.find({
      batchId: objectBatchId,
      $or: [
        { attendanceDate: { $gte: bounds.start, $lte: bounds.end } },
        { attendanceDate: { $exists: false } },
        { attendanceDate: null },
      ],
    })
      .select("date attendanceDate students")
      .lean();

    const records = attendanceRecords
      .map(attendance => {
        const dateStr = attendanceDateFromDoc(attendance);
        if (!dateStr || dateStr < bounds.start || dateStr > bounds.end) return null;

        const studentRecord = attendance.students.find(
          student => student.studentId.toString() === objectStudentId.toString(),
        );
        if (!studentRecord) return null;

        return {
          date: dateStr,
          status: studentRecord.status as "Present" | "Absent",
          remark: studentRecord.remark || "",
        };
      })
      .filter(Boolean) as Array<{ date: string; status: "Present" | "Absent"; remark: string }>;

    const present = records.filter(record => record.status === "Present").length;
    const absent = records.filter(record => record.status === "Absent").length;
    const totalDays = records.length;
    const percentage = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;

    return NextResponse.json(
      {
        success: true,
        records,
        summary: { present, absent, totalDays, percentage },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching attendance history:", error);
    return NextResponse.json({ error: "Failed to fetch attendance history" }, { status: 500 });
  }
}
