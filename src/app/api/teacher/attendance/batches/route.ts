import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import BatchModel from "@/lib/models/Batch";
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

    const objectId = new mongoose.Types.ObjectId(teacherId);

    // Fetch batches where teacherIds includes the logged-in teacher
    const batches = await BatchModel.find({
      teacherIds: { $in: [objectId] },
    })
      .select(
        "batchName courseName batchDay batchTime students _id"
      )
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        batches: batches.map((batch) => ({
          _id: batch._id,
          batchName: batch.batchName,
          courseName: batch.courseName,
          batchDay: batch.batchDay,
          batchTime: batch.batchTime,
          totalStudents: batch.students.length,
          students: batch.students.map((student) => ({
            _id: student._id,
            studentName: student.studentName,
            studentEmail: student.studentEmail,
            phone: student.phone,
          })),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching batches:", error);
    return NextResponse.json(
      { error: "Failed to fetch batches" },
      { status: 500 }
    );
  }
}
