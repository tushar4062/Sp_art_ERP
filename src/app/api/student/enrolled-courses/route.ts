import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CourseEnrollment from '@/lib/models/CourseEnrollment';
import Course from '@/lib/models/Course';
import Student from '@/lib/models/Student';
import { requireStudentFromRequest } from '@/lib/auth/require-student';
import mongoose from 'mongoose';

type CourseDocument = {
  _id: mongoose.Types.ObjectId;
  courseTitle: string;
  courseCode: string;
  instructor?: string;
  image?: string;
  duration?: number;
  totalFees?: number;
  discountFees?: number;
  discountPercentage?: number;
};

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStudentFromRequest(request);
    if (!auth.ok) return auth.response;

    const studentId = auth.student.id;

    await dbConnect();

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json(
        { error: 'Invalid student ID' },
        { status: 400 }
      );
    }

    // Ensure models are registered
    const studentModel = Student;
    const courseModel = Course;

    // Find enrollments for this student
    const enrollments = await CourseEnrollment.find({ studentId })
      .populate({
        path: 'courseId',
        model: courseModel
      })
      .sort({ enrollmentDate: -1 });

    // Format the response
    const enrolledCourses = enrollments
      .map(enrollment => {
        const course = enrollment.courseId as unknown as CourseDocument | null;
        if (!course || !course.courseTitle) return null;

        return {
          enrollmentId: enrollment._id.toString(),
          courseId: course._id.toString(),
          courseTitle: course.courseTitle,
          courseCode: course.courseCode,
          instructor: course.instructor || 'Not Assigned',
          image: course.image,
          duration: course.duration,
          totalFees: course.totalFees,
          discountFees: course.discountFees,
          discountPercentage: course.discountPercentage,
          status: enrollment.status,
          enrollmentDate: enrollment.enrollmentDate,
          completionPercentage: enrollment.completionPercentage,
          amount: enrollment.amount,
          paymentStatus: enrollment.paymentStatus,
        };
      })
      .filter(course => course !== null);

    return NextResponse.json(
      { enrolledCourses },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching enrolled courses:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to fetch enrolled courses', details: errorMessage },
      { status: 500 }
    );
  }
}
