import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import BatchModel from "@/lib/models/Batch";
import TeacherStudentAttendanceModel from "@/lib/models/TeacherStudentAttendance";
import { TEACHER_SESSION_COOKIE } from "@/lib/auth/portal-session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  try {
    await dbConnect();

    const teacherId = req.cookies.get(TEACHER_SESSION_COOKIE)?.value;
    if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
    }

    const selectedDate = req.nextUrl.searchParams.get("date");
    const batchObjectId = new mongoose.Types.ObjectId(batchId);
    const teacherObjectId = new mongoose.Types.ObjectId(teacherId);

    const batch = await BatchModel.findOne({
      _id: batchObjectId,
      teacherIds: { $in: [teacherObjectId] },
    })
      .select("batchName courseName batchDay batchTime students")
      .lean();

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    let attendance = null;
    if (selectedDate) {
      const attendanceDate = new Date(selectedDate);
      attendanceDate.setHours(0, 0, 0, 0);

      attendance = await TeacherStudentAttendanceModel.findOne({
        batchId: batchObjectId,
        date: attendanceDate,
      })
        .select("students date")
        .lean();
    }

    return NextResponse.json(
      {
        success: true,
        batch,
        attendance,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching batch attendance details:", error);
    return NextResponse.json({ error: "Failed to load batch details" }, { status: 500 });
  }
}
