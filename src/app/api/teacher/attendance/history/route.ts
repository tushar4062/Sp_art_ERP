import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import BatchModel from "@/lib/models/Batch";
import TeacherStudentAttendanceModel from "@/lib/models/TeacherStudentAttendance";
import { TEACHER_SESSION_COOKIE } from "@/lib/auth/portal-session";

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

    const [year, monthNumber] = month.split("-").map(Number);
    if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) {
      return NextResponse.json({ error: "Invalid month format" }, { status: 400 });
    }

    const objectBatchId = new mongoose.Types.ObjectId(batchId);
    const objectTeacherId = new mongoose.Types.ObjectId(teacherId);
    const objectStudentId = new mongoose.Types.ObjectId(studentId);

    const batch = await BatchModel.findOne({
      _id: objectBatchId,
      teacherIds: { $in: [objectTeacherId] },
    }).select("_id").lean();

    if (!batch) {
      return NextResponse.json({ error: "Batch not found or access denied" }, { status: 404 });
    }

    const startDate = new Date(year, monthNumber - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, monthNumber, 1);
    endDate.setHours(0, 0, 0, 0);

    const attendanceRecords = await TeacherStudentAttendanceModel.find({
      batchId: objectBatchId,
      date: { $gte: startDate, $lt: endDate },
    })
      .select("date students")
      .lean();

    const records = attendanceRecords
      .map((attendance) => {
        const studentRecord = attendance.students.find((student) =>
          student.studentId.toString() === objectStudentId.toString(),
        );

        if (!studentRecord) {
          return null;
        }

        return {
          date: attendance.date.toISOString().slice(0, 10),
          status: studentRecord.status as "Present" | "Absent",
          remark: studentRecord.remark || "",
        };
      })
      .filter(Boolean) as Array<{ date: string; status: "Present" | "Absent"; remark: string }>;

    const present = records.filter((record) => record.status === "Present").length;
    const absent = records.filter((record) => record.status === "Absent").length;
    const totalDays = records.length;
    const percentage = totalDays > 0 ? (present / totalDays) * 100 : 0;

    return NextResponse.json(
      {
        success: true,
        records,
        summary: {
          present,
          absent,
          totalDays,
          percentage,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching attendance history:", error);
    return NextResponse.json({ error: "Failed to fetch attendance history" }, { status: 500 });
  }
}
