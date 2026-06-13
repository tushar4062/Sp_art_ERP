import mongoose from "mongoose";
import CourseEnrollment, { type CourseEnrollmentDocument } from "@/lib/models/CourseEnrollment";
import EnrollmentInstallment from "@/lib/models/EnrollmentInstallment";
import EnrollmentPaymentRecord from "@/lib/models/EnrollmentPaymentRecord";
import Course from "@/lib/models/Course";
import Student from "@/lib/models/Student";
import {
  calculatePaymentBreakdown,
  derivePaymentPlanStatus,
  type PaymentType,
} from "@/lib/enrollment/paymentCalculations";
import { sendCourseEnrollmentEmail } from "@/lib/email/courseEnrollmentEmail";

export type OrderContext = {
  courseId: string;
  studentId: string;
  paymentType: PaymentType;
  termNo: number;
  enrollmentId?: string;
};

export type ResolvedOrder = {
  amount: number;
  courseTitle: string;
  breakdown: ReturnType<typeof calculatePaymentBreakdown>;
  enrollmentId?: string;
  termNo: number;
  paymentType: PaymentType;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function syncOverdueInstallments(enrollmentId: mongoose.Types.ObjectId) {
  const now = new Date();
  await EnrollmentInstallment.updateMany(
    {
      enrollmentId,
      paymentStatus: "pending",
      dueDate: { $lt: now },
    },
    { $set: { paymentStatus: "overdue" } },
  );
}

export async function refreshEnrollmentPaymentStatus(enrollment: CourseEnrollmentDocument) {
  await syncOverdueInstallments(enrollment._id);
  const installments = await EnrollmentInstallment.find({ enrollmentId: enrollment._id }).sort({
    termNo: 1,
  });

  let totalAmount = round2(enrollment.totalAmount ?? enrollment.amount ?? 0);

  // Installment plan enrollments — always reconcile from installment rows.
  if (installments.length > 0) {
    enrollment.paymentType = "installment";

    if (totalAmount <= 0) {
      totalAmount = round2(installments.reduce((sum, inst) => sum + inst.amount, 0));
    }

    const paidAmount = round2(
      installments.filter(i => i.paymentStatus === "paid").reduce((s, i) => s + i.amount, 0),
    );
    const remainingAmount = round2(Math.max(0, totalAmount - paidAmount));
    const hasOverdue = installments.some(i => i.paymentStatus === "overdue");
    const hasFailed = installments.some(i => i.paymentStatus === "failed");

    enrollment.totalAmount = totalAmount;
    enrollment.amount = enrollment.amount || totalAmount;
    enrollment.paidAmount = paidAmount;
    enrollment.remainingAmount = remainingAmount;
    enrollment.paymentPlanStatus = derivePaymentPlanStatus(
      paidAmount,
      totalAmount,
      hasOverdue,
      hasFailed,
    );
    enrollment.paymentStatus =
      enrollment.paymentPlanStatus === "paid"
        ? "paid"
        : enrollment.paymentPlanStatus === "partially_paid"
          ? "partially_paid"
          : enrollment.paymentPlanStatus;
    await enrollment.save();
    return { installments, paidAmount, remainingAmount };
  }

  const paymentType = enrollment.paymentType ?? "full";

  // Full-payment enrollments have no installment rows — derive status from payment records.
  if (installments.length === 0) {
    const records = await EnrollmentPaymentRecord.find({ enrollmentId: enrollment._id });
    let paidAmount = round2(records.reduce((sum, r) => sum + r.amount, 0));

    if (paidAmount === 0) {
      if (
        enrollment.paymentStatus === "paid" ||
        enrollment.paymentPlanStatus === "paid" ||
        enrollment.paymentId
      ) {
        paidAmount = round2(enrollment.paidAmount ?? enrollment.amount ?? totalAmount);
      } else {
        paidAmount = round2(enrollment.paidAmount ?? 0);
      }
    }

    if (paidAmount >= totalAmount - 0.01 && totalAmount > 0) {
      paidAmount = totalAmount;
    }

    const remainingAmount = round2(Math.max(0, totalAmount - paidAmount));
    const paymentPlanStatus = derivePaymentPlanStatus(paidAmount, totalAmount, false, false);

    enrollment.paidAmount = paidAmount;
    enrollment.remainingAmount = remainingAmount;
    enrollment.paymentPlanStatus = paymentPlanStatus;
    enrollment.paymentStatus =
      paymentPlanStatus === "paid"
        ? "paid"
        : paymentPlanStatus === "partially_paid"
          ? "partially_paid"
          : paymentPlanStatus;
    if (!enrollment.paymentType && paidAmount >= totalAmount - 0.01 && totalAmount > 0) {
      enrollment.paymentType = paymentType === "installment" ? "installment" : "full";
    }
    await enrollment.save();
    return { installments, paidAmount, remainingAmount };
  }

  return { installments: [], paidAmount: 0, remainingAmount: 0 };
}

export async function resolvePaymentOrder(ctx: OrderContext): Promise<ResolvedOrder> {
  const { courseId, studentId, paymentType, termNo, enrollmentId } = ctx;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new Error("Invalid courseId");
  }

  const course = await Course.findById(courseId);
  if (!course) throw new Error("Course not found");

  const baseFee = Math.max(0, Number(course.discountFees ?? course.totalFees ?? 0));
  const duration = Number(course.duration ?? 2);

  if (enrollmentId) {
    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      throw new Error("Invalid enrollmentId");
    }
    const enrollment = await CourseEnrollment.findOne({
      _id: enrollmentId,
      studentId: new mongoose.Types.ObjectId(studentId),
      courseId: new mongoose.Types.ObjectId(courseId),
    });
    if (!enrollment) throw new Error("Enrollment not found");

    const installment = await EnrollmentInstallment.findOne({
      enrollmentId: enrollment._id,
      termNo,
    });
    if (!installment) throw new Error("Installment term not found");
    if (installment.paymentStatus === "paid") {
      throw new Error("This installment is already paid");
    }

    const breakdown = calculatePaymentBreakdown(
      enrollment.baseAmount ?? baseFee,
      duration,
      "installment",
      enrollment.enrollmentDate,
    );

    return {
      amount: installment.amount,
      courseTitle: course.courseTitle,
      breakdown,
      enrollmentId,
      termNo,
      paymentType: "installment",
    };
  }

  const existing = await CourseEnrollment.findOne({
    studentId: new mongoose.Types.ObjectId(studentId),
    courseId: new mongoose.Types.ObjectId(courseId),
  });
  if (existing) {
    throw new Error("Already enrolled in this course");
  }

  const breakdown = calculatePaymentBreakdown(baseFee, duration, paymentType);
  const amount =
    paymentType === "full" ? breakdown.totalAmount : breakdown.termAmounts[termNo - 1] ?? breakdown.termAmounts[0];

  return {
    amount,
    courseTitle: course.courseTitle,
    breakdown,
    termNo: paymentType === "full" ? 1 : termNo,
    paymentType,
  };
}

export type ProcessPaymentInput = {
  studentId: string;
  courseId: string;
  paymentType: PaymentType;
  termNo: number;
  enrollmentId?: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaid: number;
};

export async function processSuccessfulPayment(input: ProcessPaymentInput) {
  const {
    studentId,
    courseId,
    paymentType,
    termNo,
    enrollmentId,
    razorpayOrderId,
    razorpayPaymentId,
    amountPaid,
  } = input;

  const existingRecord = await EnrollmentPaymentRecord.findOne({ orderId: razorpayOrderId });
  if (existingRecord) {
    return {
      enrollmentId: existingRecord.enrollmentId.toString(),
      alreadyProcessed: true,
    };
  }

  const course = await Course.findById(courseId);
  if (!course) throw new Error("Course not found");

  const student = await Student.findById(studentId);
  if (!student) throw new Error("Student not found");

  const baseFee = Math.max(0, Number(course.discountFees ?? course.totalFees ?? 0));
  const duration = Number(course.duration ?? 2);
  const breakdown = calculatePaymentBreakdown(baseFee, duration, paymentType);
  const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const supportEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM || "support@littlebrushes.com";
  const supportPhone = process.env.SUPPORT_PHONE || "+91 90000 00000";

  let enrollment: CourseEnrollmentDocument;

  if (enrollmentId) {
    const found = await CourseEnrollment.findOne({
      _id: enrollmentId,
      studentId: new mongoose.Types.ObjectId(studentId),
    });
    if (!found) throw new Error("Enrollment not found");
    enrollment = found;
  } else {
    const discountAmount = Math.max(0, (course.totalFees ?? 0) - baseFee);
    enrollment = await CourseEnrollment.create({
      studentId: new mongoose.Types.ObjectId(studentId),
      courseId: new mongoose.Types.ObjectId(courseId),
      enrollmentDate: new Date(),
      status: "active",
      completionPercentage: 0,
      paymentType,
      paymentId: razorpayPaymentId,
      orderId: razorpayOrderId,
      amount: breakdown.totalAmount,
      baseAmount: breakdown.baseAmount,
      totalAmount: breakdown.totalAmount,
      paidAmount: 0,
      remainingAmount: breakdown.totalAmount,
      taxAmount: breakdown.gstAmount,
      installmentCharge: breakdown.installmentCharge,
      paymentStatus: paymentType === "full" ? "paid" : "partially_paid",
      paymentPlanStatus: paymentType === "full" ? "paid" : "partially_paid",
      paymentMethod: "Razorpay",
      discountPercentage: course.discountPercentage ?? 0,
      discountAmount,
      invoiceId,
      invoiceGeneratedAt: new Date(),
    });

    if (paymentType === "installment") {
      const installmentDocs = breakdown.termAmounts.map((amt, idx) => ({
        enrollmentId: enrollment._id,
        termNo: idx + 1,
        amount: amt,
        dueDate: new Date(breakdown.dueDates[idx]),
        paymentStatus: "pending" as const,
      }));
      await EnrollmentInstallment.insertMany(installmentDocs);
    }
  }

  const gstPortion =
    paymentType === "full"
      ? breakdown.gstAmount
      : round2((breakdown.gstAmount / breakdown.termCount) * (paymentType === "installment" ? 1 : 1));
  const chargePortion =
    paymentType === "installment"
      ? round2(breakdown.installmentCharge / breakdown.termCount)
      : 0;

  await EnrollmentPaymentRecord.create({
    enrollmentId: enrollment._id,
    studentId: enrollment.studentId,
    courseId: enrollment.courseId,
    termNo: paymentType === "full" ? 1 : termNo,
    amount: amountPaid,
    gstAmount: gstPortion,
    installmentChargePortion: chargePortion,
    paymentId: razorpayPaymentId,
    orderId: razorpayOrderId,
    paymentStatus: "paid",
    paymentMethod: "Razorpay",
    invoiceId,
    paidAt: new Date(),
  });

  if (paymentType === "installment") {
    await EnrollmentInstallment.findOneAndUpdate(
      { enrollmentId: enrollment._id, termNo },
      { paymentStatus: "paid", paidDate: new Date() },
    );
    await refreshEnrollmentPaymentStatus(enrollment);
    enrollment.paymentId = razorpayPaymentId;
    enrollment.orderId = razorpayOrderId;
    await enrollment.save();
  } else {
    const installmentCount = await EnrollmentInstallment.countDocuments({
      enrollmentId: enrollment._id,
    });
    if (installmentCount > 0) {
      await EnrollmentInstallment.findOneAndUpdate(
        { enrollmentId: enrollment._id, termNo: 1 },
        { paymentStatus: "paid", paidDate: new Date() },
        { upsert: false },
      );
      await refreshEnrollmentPaymentStatus(enrollment);
    } else {
      enrollment.paidAmount = breakdown.totalAmount;
      enrollment.remainingAmount = 0;
      enrollment.paymentPlanStatus = "paid";
      enrollment.paymentStatus = "paid";
      enrollment.paymentType = "full";
      await enrollment.save();
    }
  }

  if (student.email) {
    try {
      await sendCourseEnrollmentEmail({
        studentEmail: student.email,
        studentName: student.fullName,
        courseTitle: course.courseTitle,
        courseCode: course.courseCode,
        enrollmentDate: enrollment.enrollmentDate.toISOString(),
        amountPaid,
        paymentMethod: "Razorpay",
        transactionId: razorpayPaymentId,
        orderId: razorpayOrderId,
        invoiceId,
        supportEmail,
        supportPhone,
        courseDurationMonths: duration,
        discountPercentage: course.discountPercentage ?? 0,
        discountAmount: enrollment.discountAmount ?? 0,
        gstNumber: process.env.GST_NUMBER,
        baseAmount: breakdown.baseAmount,
        gstAmount: breakdown.gstAmount,
        installmentCharge: breakdown.installmentCharge,
        termNo: paymentType === "full" ? undefined : termNo,
        paymentType,
      });
    } catch (mailErr) {
      console.error("Failed to send enrollment email:", mailErr);
    }
  }

  return { enrollmentId: enrollment._id.toString(), alreadyProcessed: false };
}
