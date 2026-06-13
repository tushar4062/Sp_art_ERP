import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import CourseEnrollment from "@/lib/models/CourseEnrollment";
import EnrollmentInstallment from "@/lib/models/EnrollmentInstallment";
import EnrollmentPaymentRecord from "@/lib/models/EnrollmentPaymentRecord";
import Course from "@/lib/models/Course";
import { requireStudentFromRequest } from "@/lib/auth/require-student";
import { refreshEnrollmentPaymentStatus } from "@/lib/enrollment/enrollmentPaymentService";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStudentFromRequest(request);
    if (!auth.ok) return auth.response;

    const studentId = auth.student.id;
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const enrollments = await CourseEnrollment.find({ studentId })
      .populate({ path: "courseId", model: Course })
      .sort({ enrollmentDate: -1 });

    const enrolledCourses = [];

    for (const enrollment of enrollments) {
      const course = enrollment.courseId as {
        _id: mongoose.Types.ObjectId;
        courseTitle?: string;
        courseCode?: string;
        instructor?: string;
        image?: string;
        duration?: number;
        totalFees?: number;
        discountFees?: number;
        discountPercentage?: number;
      } | null;

      if (!course?.courseTitle) continue;

      await refreshEnrollmentPaymentStatus(enrollment);

      const installments = await EnrollmentInstallment.find({ enrollmentId: enrollment._id }).sort({
        termNo: 1,
      });
      const paymentHistory = await EnrollmentPaymentRecord.find({
        enrollmentId: enrollment._id,
      }).sort({ paidAt: -1 });

      const nextDue = installments.find(
        i => i.paymentStatus === "pending" || i.paymentStatus === "overdue",
      );

      enrolledCourses.push({
        enrollmentId: enrollment._id.toString(),
        courseId: course._id.toString(),
        courseTitle: course.courseTitle,
        courseCode: course.courseCode,
        instructor: course.instructor || "Not Assigned",
        image: course.image,
        duration: course.duration,
        totalFees: course.totalFees,
        discountFees: course.discountFees,
        discountPercentage: course.discountPercentage,
        status: enrollment.status,
        enrollmentDate: enrollment.enrollmentDate,
        completionPercentage: enrollment.completionPercentage,
        paymentType: installments.length > 0 ? "installment" : (enrollment.paymentType ?? "full"),
        baseAmount: enrollment.baseAmount ?? 0,
        gstAmount: enrollment.taxAmount ?? 0,
        installmentCharge: enrollment.installmentCharge ?? 0,
        totalAmount: enrollment.totalAmount ?? enrollment.amount ?? 0,
        paidAmount: enrollment.paidAmount ?? enrollment.amount ?? 0,
        remainingAmount: enrollment.remainingAmount ?? 0,
        paymentStatus: enrollment.paymentStatus,
        paymentPlanStatus: enrollment.paymentPlanStatus ?? enrollment.paymentStatus ?? "pending",
        nextDueDate: nextDue?.dueDate ?? null,
        nextDueAmount: nextDue?.amount ?? null,
        nextTermNo: nextDue?.termNo ?? null,
        installments: installments.map(i => ({
          termNo: i.termNo,
          amount: i.amount,
          dueDate: i.dueDate,
          paidDate: i.paidDate,
          paymentStatus: i.paymentStatus,
        })),
        paymentHistory: paymentHistory.map(p => ({
          paymentDate: p.paidAt,
          paymentId: p.paymentId,
          orderId: p.orderId,
          amount: p.amount,
          termNo: p.termNo,
          status: p.paymentStatus,
          invoiceId: p.invoiceId,
        })),
      });
    }

    return NextResponse.json({ enrolledCourses }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching enrolled courses:", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch enrolled courses", details: errorMessage },
      { status: 500 },
    );
  }
}
