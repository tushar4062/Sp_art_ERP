import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import TeacherStudentAttendanceModel from "@/lib/models/TeacherStudentAttendance";
import TeacherModel from "@/lib/models/Teacher";
import { TEACHER_SESSION_COOKIE } from "@/lib/auth/portal-session";
import { normalizeDateOnly } from "@/lib/dates/attendanceDate";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const teacherId = req.cookies.get(TEACHER_SESSION_COOKIE)?.value;
    if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { batchId, batchName, courseName, date, students } = body;

    if (!batchId || !batchName || !courseName || !date || !students || !Array.isArray(students)) {
      return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
    }

    const attendanceDate = normalizeDateOnly(date);
    if (!attendanceDate) {
      return NextResponse.json({ error: "Invalid date. Use YYYY-MM-DD." }, { status: 400 });
    }

    const teacher = await TeacherModel.findById(teacherId).select("fullName");
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const objectBatchId = new mongoose.Types.ObjectId(batchId);
    const objectTeacherId = new mongoose.Types.ObjectId(teacherId);

    const existingAttendance = await TeacherStudentAttendanceModel.findOne({
      batchId: objectBatchId,
      attendanceDate,
    });

    if (existingAttendance) {
      existingAttendance.students = students;
      existingAttendance.teacherName = teacher.fullName;
      existingAttendance.attendanceDate = attendanceDate;
      await existingAttendance.save();
    } else {
      await TeacherStudentAttendanceModel.create({
        batchId: objectBatchId,
        batchName,
        courseName,
        teacherId: objectTeacherId,
        teacherName: teacher.fullName,
        attendanceDate,
        students,
      });
    }

    return NextResponse.json(
      { success: true, message: "Attendance submitted successfully", attendanceDate },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error saving attendance:", error);
    return NextResponse.json({ error: "Failed to save attendance" }, { status: 500 });
  }
}
