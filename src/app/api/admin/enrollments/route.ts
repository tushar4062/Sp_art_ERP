import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import type { CourseDocument } from "@/lib/models/Course";
import type { CourseEnrollmentDocument } from "@/lib/models/CourseEnrollment";
import type { StudentDocument } from "@/lib/models/Student";
import dbConnect from "@/lib/mongodb";
import CourseEnrollment from "@/lib/models/CourseEnrollment";
import EnrollmentInstallment from "@/lib/models/EnrollmentInstallment";
import EnrollmentPaymentRecord from "@/lib/models/EnrollmentPaymentRecord";
import Student from "@/lib/models/Student";
import Course from "@/lib/models/Course";
import { requireAdminFromRequest } from "@/lib/auth/require-admin";
import { refreshEnrollmentPaymentStatus } from "@/lib/enrollment/enrollmentPaymentService";

export const runtime = "nodejs";

type PopulatedEnrollment = CourseEnrollmentDocument & {
  studentId: StudentDocument;
  courseId: CourseDocument;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminFromRequest(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter");

    await dbConnect();

    const enrollments = await CourseEnrollment.find()
      .populate({ path: "studentId", model: Student })
      .populate({ path: "courseId", model: Course })
      .sort({ enrollmentDate: -1 });

    const populatedEnrollments = enrollments as unknown as PopulatedEnrollment[];
    const formattedEnrollments = [];

    for (const enrollment of populatedEnrollments) {
      const student = enrollment.studentId;
      const course = enrollment.courseId;
      if (!student?.fullName || !course?.courseTitle) continue;

      await refreshEnrollmentPaymentStatus(enrollment);
      const installments = await EnrollmentInstallment.find({ enrollmentId: enrollment._id }).sort({
        termNo: 1,
      });
      const paymentHistory = await EnrollmentPaymentRecord.find({
        enrollmentId: enrollment._id,
      }).sort({ paidAt: -1 });

      const planStatus = enrollment.paymentPlanStatus ?? enrollment.paymentStatus ?? "pending";
      if (filter === "pending" && !["pending", "partially_paid"].includes(planStatus)) continue;
      if (filter === "overdue" && planStatus !== "overdue") continue;

      formattedEnrollments.push({
        enrollmentId: enrollment._id.toString(),
        studentId: student._id?.toString() ?? enrollment.studentId.toString(),
        studentName: student.fullName,
        studentEmail: student.email ?? "",
        courseId: course._id?.toString() ?? enrollment.courseId.toString(),
        courseTitle: course.courseTitle,
        courseCode: course.courseCode,
        enrollmentDate: enrollment.enrollmentDate,
        status: enrollment.status,
        completionPercentage: enrollment.completionPercentage,
        paymentType: installments.length > 0 ? "installment" : (enrollment.paymentType ?? "full"),
        baseAmount: enrollment.baseAmount ?? 0,
        gstAmount: enrollment.taxAmount ?? 0,
        installmentCharge: enrollment.installmentCharge ?? 0,
        totalAmount: enrollment.totalAmount ?? enrollment.amount ?? 0,
        paidAmount: enrollment.paidAmount ?? 0,
        remainingAmount: enrollment.remainingAmount ?? 0,
        amount: enrollment.amount,
        paymentStatus: enrollment.paymentStatus,
        paymentPlanStatus: planStatus,
        installments: installments.map(i => ({
          installmentId: i._id.toString(),
          termNo: i.termNo,
          amount: i.amount,
          dueDate: i.dueDate,
          paidDate: i.paidDate,
          paymentStatus: i.paymentStatus,
        })),
        paymentHistory: paymentHistory.map(p => ({
          paymentDate: p.paidAt,
          paymentId: p.paymentId,
          amount: p.amount,
          termNo: p.termNo,
          status: p.paymentStatus,
        })),
      });
    }

    return NextResponse.json({ enrollments: formattedEnrollments }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching enrollments:", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch enrollments", details: errorMessage },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  if (searchParams.get("action") !== "report") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await dbConnect();
  const enrollments = await CourseEnrollment.find()
    .populate({ path: "studentId", model: Student })
    .populate({ path: "courseId", model: Course })
    .sort({ enrollmentDate: -1 });

  const rows = [
    [
      "Student",
      "Email",
      "Course",
      "Payment Type",
      "Total",
      "Paid",
      "Remaining",
      "Status",
      "Enrollment Date",
    ].join(","),
  ];

  for (const enrollment of enrollments as unknown as PopulatedEnrollment[]) {
    const student = enrollment.studentId;
    const course = enrollment.courseId;
    if (!student?.fullName || !course?.courseTitle) continue;
    rows.push(
      [
        `"${student.fullName}"`,
        student.email ?? "",
        `"${course.courseTitle}"`,
        enrollment.paymentType ?? "full",
        enrollment.totalAmount ?? enrollment.amount ?? 0,
        enrollment.paidAmount ?? 0,
        enrollment.remainingAmount ?? 0,
        enrollment.paymentPlanStatus ?? enrollment.paymentStatus ?? "",
        enrollment.enrollmentDate.toISOString().slice(0, 10),
      ].join(","),
    );
  }

  return new NextResponse(rows.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="enrollment-report.csv"',
    },
  });
}
