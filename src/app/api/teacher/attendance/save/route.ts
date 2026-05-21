import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import TeacherStudentAttendanceModel from "@/lib/models/TeacherStudentAttendance";
import TeacherModel from "@/lib/models/Teacher";
import { TEACHER_SESSION_COOKIE } from "@/lib/auth/portal-session";

export async function POST(req: NextRequest) {
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
    const body = await req.json();

    const {
      batchId,
      batchName,
      courseName,
      date,
      students,
    } = body;

    // Validate required fields
    if (!batchId || !batchName || !courseName || !date || !students || !Array.isArray(students)) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return NextResponse.json(
        { error: "Invalid batch ID" },
        { status: 400 }
      );
    }

    // Fetch teacher details
    const teacher = await TeacherModel.findById(teacherId).select("fullName");
    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher not found" },
        { status: 404 }
      );
    }

    // Parse date and normalize to start of day
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const objectBatchId = new mongoose.Types.ObjectId(batchId);
    const objectTeacherId = new mongoose.Types.ObjectId(teacherId);

    // Check if attendance already exists for this batch and date
    const existingAttendance = await TeacherStudentAttendanceModel.findOne({
      batchId: objectBatchId,
      date: attendanceDate,
    });

    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.students = students;
      existingAttendance.teacherName = teacher.fullName;
      await existingAttendance.save();
    } else {
      // Create new attendance record
      const attendanceRecord = new TeacherStudentAttendanceModel({
        batchId: objectBatchId,
        batchName,
        courseName,
        teacherId: objectTeacherId,
        teacherName: teacher.fullName,
        date: attendanceDate,
        students,
      });

      await attendanceRecord.save();
    }

    return NextResponse.json(
      {
        success: true,
        message: "Attendance submitted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving attendance:", error);
    return NextResponse.json(
      { error: "Failed to save attendance" },
      { status: 500 }
    );
  }
}
