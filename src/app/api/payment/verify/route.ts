import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Course from "@/lib/models/Course";
import CourseEnrollment from "@/lib/models/CourseEnrollment";
import { requireStudentFromRequest } from "@/lib/auth/require-student";
import { processSuccessfulPayment } from "@/lib/enrollment/enrollmentPaymentService";
import { completeReferralOnPayment } from "@/lib/referral/referralService";
import { calculatePaymentBreakdown, type PaymentType } from "@/lib/enrollment/paymentCalculations";

type VerifyPaymentRequest = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  amount?: number | string;
  courseId: string;
  paymentType?: PaymentType;
  termNo?: number;
  enrollmentId?: string;
  referralCode?: string;
};

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStudentFromRequest(request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as VerifyPaymentRequest;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      courseId,
      paymentType = "full",
      termNo = 1,
      enrollmentId,
      referralCode,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courseId) {
      return NextResponse.json({ error: "Missing payment verification fields" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json({ error: "Invalid courseId format" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || "";
    if (!secret) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    await dbConnect();

    const result = await processSuccessfulPayment({
      studentId: auth.student.id,
      courseId,
      paymentType: paymentType === "installment" ? "installment" : "full",
      termNo: Math.max(1, Number(termNo)),
      enrollmentId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amountPaid: Number(amount || 0),
    });

    const course = await Course.findById(courseId);
    const enrollment = await CourseEnrollment.findById(result.enrollmentId);

    let courseAmount = Number(enrollment?.totalAmount ?? enrollment?.amount ?? 0);
    if (courseAmount <= 0 && course) {
      const baseFee = Math.max(0, Number(course.discountFees ?? course.totalFees ?? 0));
      const duration = Number(course.duration ?? 2);
      const resolvedPaymentType: PaymentType =
        enrollment?.paymentType === "installment" ? "installment" : "full";
      const breakdown = calculatePaymentBreakdown(baseFee, duration, resolvedPaymentType);
      courseAmount = breakdown.totalAmount;
    }
    if (courseAmount <= 0) {
      courseAmount = Number(amount || 0);
    }

    await completeReferralOnPayment({
      referredStudentId: auth.student.id,
      enrollmentId: result.enrollmentId,
      courseId,
      courseTitle: course?.courseTitle ?? "Course",
      courseAmount,
      orderId: razorpay_order_id,
      referralCode: typeof referralCode === "string" ? referralCode.trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      enrollmentId: result.enrollmentId,
      message: result.alreadyProcessed ? "Already processed" : "Enrollment saved successfully",
    });
  } catch (error) {
    console.error("Payment verify error:", error);
    if (error instanceof Error && error.message.includes("duplicate")) {
      return NextResponse.json(
        { error: "Duplicate enrollment detected. Student already enrolled in this course." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        error: "Payment verification failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
