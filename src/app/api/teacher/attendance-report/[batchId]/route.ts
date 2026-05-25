import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import BatchModel, { type BatchEmbeddedStudent } from "@/lib/models/Batch";
import TeacherStudentAttendanceModel, {
  type AttendanceStudent,
} from "@/lib/models/TeacherStudentAttendance";
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

    const attendanceDocs = await TeacherStudentAttendanceModel.find({ batchId: batchObjectId })
      .select("students")
      .lean();

    const studentCounts = new Map<string, { presentCount: number; absentCount: number }>();
    batch.students.forEach((student: BatchEmbeddedStudent) => {
      studentCounts.set(student._id.toString(), { presentCount: 0, absentCount: 0 });
    });

    attendanceDocs.forEach(doc => {
      doc.students.forEach((student: AttendanceStudent) => {
        const key = student.studentId?.toString();
        if (!key) return;
        const counts = studentCounts.get(key);
        if (!counts) return;
        if (student.status === "Present") {
          counts.presentCount += 1;
        } else if (student.status === "Absent") {
          counts.absentCount += 1;
        }
      });
    });

    const students = batch.students.map((student: BatchEmbeddedStudent) => ({
      _id: student._id.toString(),
      studentName: student.studentName,
      studentEmail: student.studentEmail,
      presentCount: studentCounts.get(student._id.toString())?.presentCount ?? 0,
      absentCount: studentCounts.get(student._id.toString())?.absentCount ?? 0,
    }));

    return NextResponse.json({
      success: true,
      batch: {
        _id: batch._id.toString(),
        batchName: batch.batchName,
        courseName: batch.courseName,
        batchDay: batch.batchDay,
        batchTime: batch.batchTime,
        students,
      },
    });
  } catch (error) {
    console.error("Error fetching teacher batch attendance report:", error);
    return NextResponse.json({ error: "Failed to load attendance report" }, { status: 500 });
  }
}
