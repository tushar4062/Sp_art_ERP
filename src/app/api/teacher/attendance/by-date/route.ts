import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import TeacherStudentAttendanceModel from "@/lib/models/TeacherStudentAttendance";
import { TEACHER_SESSION_COOKIE } from "@/lib/auth/portal-session";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    // Authenticate teacher
    const teacherId = req.cookies.get(TEACHER_SESSION_COOKIE)?.value;
    if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get("batchId");
    const date = searchParams.get("date");

    if (!batchId || !date) {
      return NextResponse.json(
        { error: "Missing batchId or date" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return NextResponse.json(
        { error: "Invalid batch ID" },
        { status: 400 }
      );
    }

    // Parse date and normalize to start of day
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const objectBatchId = new mongoose.Types.ObjectId(batchId);

    // Fetch existing attendance
    const attendance = await TeacherStudentAttendanceModel.findOne({
      batchId: objectBatchId,
      date: attendanceDate,
    }).lean();

    if (!attendance) {
      return NextResponse.json(
        {
          success: true,
          attendance: null,
          message: "No attendance found for this date",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        attendance,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}
