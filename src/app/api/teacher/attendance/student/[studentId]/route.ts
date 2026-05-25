import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import BatchModel, { type BatchEmbeddedStudent } from "@/lib/models/Batch";
import TeacherStudentAttendanceModel, {
  type AttendanceStudent,
} from "@/lib/models/TeacherStudentAttendance";
import { TEACHER_SESSION_COOKIE } from "@/lib/auth/portal-session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const batchId = req.nextUrl.searchParams.get("batchId");

  try {
    await dbConnect();

    const teacherId = req.cookies.get(TEACHER_SESSION_COOKIE)?.value;
    if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!batchId || !mongoose.Types.ObjectId.isValid(batchId)) {
      return NextResponse.json({ error: "Invalid or missing batch ID" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const batchObjectId = new mongoose.Types.ObjectId(batchId);
    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const teacherObjectId = new mongoose.Types.ObjectId(teacherId);

    const batch = await BatchModel.findOne({
      _id: batchObjectId,
      teacherIds: { $in: [teacherObjectId] },
      "students._id": studentObjectId,
    })
      .select("batchName courseName batchDay batchTime students")
      .lean();

    if (!batch) {
      return NextResponse.json({ error: "Batch or student not found" }, { status: 404 });
    }

    const student = batch.students.find(
      (entry: BatchEmbeddedStudent) => entry._id.toString() === studentId,
    );
    if (!student) {
      return NextResponse.json({ error: "Student not found in batch" }, { status: 404 });
    }

    const attendanceDocs = await TeacherStudentAttendanceModel.find({
      batchId: batchObjectId,
      "students.studentId": studentObjectId,
    })
      .select("date students")
      .lean();

    const attendanceRecords = attendanceDocs.flatMap(doc =>
      doc.students
        .filter(
          (studentEntry: AttendanceStudent) =>
            studentEntry.studentId?.toString() === studentId,
        )
        .map((studentEntry: AttendanceStudent) => ({
          date: doc.date.toISOString().split("T")[0],
          status: studentEntry.status,
        }))
    );

    return NextResponse.json({
      success: true,
      data: {
        batchId: batch._id.toString(),
        batchName: batch.batchName,
        courseName: batch.courseName,
        studentName: student.studentName,
        studentEmail: student.studentEmail,
        attendanceRecords,
      },
    });
  } catch (error) {
    console.error("Error fetching student attendance preview:", error);
    return NextResponse.json({ error: "Failed to load student attendance preview" }, { status: 500 });
  }
}
