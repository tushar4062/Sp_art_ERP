import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Student from "@/lib/models/Student";
import CourseEnrollment from "@/lib/models/CourseEnrollment";
import { requireSeniorTeacherFromRequest } from "@/lib/auth/require-senior-teacher";
import { singleStudentScope } from "@/lib/auth/senior-teacher-student-scope";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSeniorTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid student id" }, { status: 400 });
    }

    await dbConnect();
    const student = await Student.findOne(singleStudentScope(id, auth.seniorTeacher.id));
    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    // Use aggregation + $lookup to avoid mongoose model registration order issues
    const pipeline = [
      { $match: { studentId: student._id } },
      {
        $lookup: {
          from: 'courses',
          localField: 'courseId',
          foreignField: '_id',
          as: 'course',
        },
      },
      { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          course: '$course',
          enrollmentDate: 1,
          status: 1,
          completionPercentage: 1,
          amount: 1,
          paymentStatus: 1,
        },
      },
    ];

    const enrollments = (await CourseEnrollment.collection.aggregate(pipeline).toArray()) as unknown;

    type EnrollmentDoc = {
      _id: mongoose.Types.ObjectId | string;
      course?: { _id: mongoose.Types.ObjectId | string; courseTitle?: string; courseCode?: string } | null;
      enrollmentDate?: Date | string;
      status?: string;
      completionPercentage?: number;
      amount?: number;
      paymentStatus?: string;
    };

    const mapped = (enrollments as EnrollmentDoc[]).map((e) => ({
      _id: String(e._id),
      courseId: e.course?._id ? String(e.course._id) : undefined,
      course: e.course
        ? {
            _id: String(e.course._id),
            courseTitle: e.course.courseTitle,
            courseCode: e.course.courseCode,
          }
        : undefined,
      enrollmentDate: e.enrollmentDate ? new Date(e.enrollmentDate).toISOString() : undefined,
      status: e.status,
      completionPercentage: e.completionPercentage,
      amount: e.amount,
      paymentStatus: e.paymentStatus,
    }));

    return NextResponse.json({ success: true, data: { enrollments: mapped } });
  } catch (error) {
    console.error("[senior-teacher/students/[id]/courses GET]", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message || "Failed to load enrollments" }, { status: 500 });
  }
}
