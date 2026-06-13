import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import dbConnect from "@/lib/mongodb";
import { requireStudentFromRequest } from "@/lib/auth/require-student";
import { assertRazorpayConfigured } from "@/lib/razorpay/config";
import Course from "@/lib/models/Course";
import Student from "@/lib/models/Student";
import { resolvePaymentOrder } from "@/lib/enrollment/enrollmentPaymentService";
import type { PaymentType } from "@/lib/enrollment/paymentCalculations";
import {
  validateReferralCode,
  createPendingReferralTransaction,
} from "@/lib/referral/referralService";

export const runtime = "nodejs";

function normalizePhoneForRazorpay(phone?: string) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStudentFromRequest(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const courseId = typeof body?.courseId === "string" ? body.courseId.trim() : "";
    const paymentType: PaymentType =
      body?.paymentType === "installment" ? "installment" : "full";
    const termNo = Math.max(1, Number(body?.termNo ?? 1));
    const enrollmentId =
      typeof body?.enrollmentId === "string" ? body.enrollmentId.trim() : undefined;
    const referralCode =
      typeof body?.referralCode === "string" ? body.referralCode.trim() : undefined;

    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    await dbConnect();

    let resolved;
    try {
      resolved = await resolvePaymentOrder({
        courseId,
        studentId: auth.student.id,
        paymentType,
        termNo,
        enrollmentId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to resolve payment";
      const status = message.includes("Already enrolled") ? 409 : 400;
      return NextResponse.json({ error: message }, { status });
    }

    let validatedReferral: Awaited<ReturnType<typeof validateReferralCode>> | null = null;
    if (referralCode && !enrollmentId) {
      const validation = await validateReferralCode(referralCode, auth.student.id);
      if (validation.valid === false) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      validatedReferral = validation;
    }

    const { keyId: razorpayKeyId, keySecret: razorpayKeySecret } = assertRazorpayConfigured();
    const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });

    const order = await razorpay.orders.create({
      amount: Math.round(resolved.amount * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: {
        courseId,
        studentId: auth.student.id,
        paymentType: resolved.paymentType,
        termNo: String(resolved.termNo),
        ...(resolved.enrollmentId ? { enrollmentId: resolved.enrollmentId } : {}),
        ...(validatedReferral?.valid ? { referralCode: validatedReferral.referralCode } : {}),
      },
    });

    if (validatedReferral?.valid) {
      const student = await Student.findById(auth.student.id).select("fullName");
      await createPendingReferralTransaction({
        referrerId: validatedReferral.referrerId,
        referredStudentId: auth.student.id,
        referredStudentName: student?.fullName ?? "Student",
        referralCode: validatedReferral.referralCode,
        referralPercentage: validatedReferral.referralPercentage,
        courseAmount: resolved.breakdown.totalAmount,
        orderId: order.id,
      });
    }

    const student = await Student.findById(auth.student.id).select("fullName email phone fatherMobile");
    const prefill = {
      name: student?.fullName ?? "",
      email: student?.email ?? "",
      contact: normalizePhoneForRazorpay(student?.phone || student?.fatherMobile),
    };

    return NextResponse.json({
      order,
      keyId: razorpayKeyId,
      amount: resolved.amount,
      breakdown: resolved.breakdown,
      termNo: resolved.termNo,
      paymentType: resolved.paymentType,
      enrollmentId: resolved.enrollmentId,
      prefill,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      {
        error: "Failed to create order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
