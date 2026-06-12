import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import Course from '@/lib/models/Course';
import OfflinePayment from '@/lib/models/OfflinePayment';
import PaymentAuditLog from '@/lib/models/PaymentAuditLog';
import { requireAdminFromRequest } from '@/lib/auth/require-admin';
import { sendTransactionalEmail } from '@/lib/email/mailer';

export const runtime = 'nodejs';

const ALLOWED_OFFLINE_METHODS = ['cash', 'cheque', 'bank_transfer', 'upi'] as const;

type OfflineChannel = (typeof ALLOWED_OFFLINE_METHODS)[number];

type CreateOfflinePaymentPayload = {
  student_id: string;
  course_id: string;
  amount: number;
  payment_method: OfflineChannel;
  expected_payment_date?: string;
  notes?: string;
};

function formatDateToYYYYMMDD(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

async function generateReferenceId() {
  const now = new Date();
  const prefix = `OFFLINE_${formatDateToYYYYMMDD(now)}`;

  // Find all payment references for today and get the highest sequence
  const allReferences = await OfflinePayment.find({
    offlinePaymentReference: { $regex: `^${prefix}_` },
  })
    .select('offlinePaymentReference')
    .lean();

  let sequence = 1;
  if (allReferences.length > 0) {
    const sequences = allReferences
      .map((doc) => {
        const match = doc.offlinePaymentReference?.match(/_(\d{3})$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((num) => Number.isFinite(num) && num > 0);

    if (sequences.length > 0) {
      sequence = Math.max(...sequences) + 1;
    }
  }

  return `${prefix}_${String(sequence).padStart(3, '0')}`;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

function buildPaymentInstructionEmail(params: {
  studentName: string;
  courseName: string;
  referenceId: string;
  amount: number;
  expectedPaymentDate?: string;
  academyName: string;
  supportEmail: string;
  supportPhone: string;
}) {
  const {
    studentName,
    courseName,
    referenceId,
    amount,
    expectedPaymentDate,
    academyName,
    supportEmail,
    supportPhone,
  } = params;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Payment Request Created</title>
  </head>
  <body style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;padding:0;background:#f4f6fb;color:#111827;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 20px 56px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:#1d4ed8;color:#ffffff;padding:28px 32px;">
                <h1 style="margin:0;font-size:24px;">Payment Request Created</h1>
                <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">${academyName}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 18px;font-size:16px;">Hi ${studentName},</p>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.65;">Your payment request for <strong>${courseName}</strong> has been created successfully.</p>
                <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;">
                  <tr><td style="padding:16px;"><strong>Reference ID</strong></td><td style="padding:16px;">${referenceId}</td></tr>
                  <tr><td style="padding:16px;"><strong>Amount</strong></td><td style="padding:16px;">₹${amount.toFixed(2)}</td></tr>
                  ${expectedPaymentDate ? `<tr><td style="padding:16px;"><strong>Due Date</strong></td><td style="padding:16px;">${expectedPaymentDate}</td></tr>` : ''}
                  <tr><td style="padding:16px;"><strong>Status</strong></td><td style="padding:16px;">Pending Verification</td></tr>
                </table>
                <p style="margin:24px 0 0;font-size:15px;line-height:1.65;">Please visit the academy office with the payment reference or follow the instructions shared by your administrator.</p>
                <hr style="margin:28px 0;border:none;border-top:1px solid #e5e7eb;" />
                <p style="margin:0 0 8px;font-size:14px;letter-spacing:0.02em;color:#6b7280;">Need help?</p>
                <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">Email: ${supportEmail}<br />Phone: ${supportPhone}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminFromRequest(request);
    if (!auth.ok) return auth.response;

    await dbConnect();

    let payload: CreateOfflinePaymentPayload;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const studentId = String(payload.student_id || '').trim();
    const courseId = String(payload.course_id || '').trim();
    const amount = Number(payload.amount);
    const paymentMethod = String(payload.payment_method || '').trim() as OfflineChannel;
    const expectedPaymentDate = parseDate(payload.expected_payment_date);
    const notes = String(payload.notes || '').trim();

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ success: false, error: `Student ID is invalid` }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json({ success: false, error: `Course ID is invalid` }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be greater than 0' }, { status: 400 });
    }
    if (!ALLOWED_OFFLINE_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ success: false, error: 'payment_method must be cash, cheque, or bank_transfer' }, { status: 400 });
    }
    if (payload.expected_payment_date && !expectedPaymentDate) {
      return NextResponse.json({ success: false, error: 'expected_payment_date must be a valid date' }, { status: 400 });
    }

    const student = await Student.findById(studentId).lean();
    if (!student) {
      return NextResponse.json({ success: false, error: `Student with ID ${studentId} not found` }, { status: 404 });
    }

    const course = await Course.findById(courseId).lean();
    if (!course) {
      return NextResponse.json({ success: false, error: `Course with ID ${courseId} not found` }, { status: 404 });
    }

    const existingPending = await OfflinePayment.findOne({
      studentId: new mongoose.Types.ObjectId(studentId),
      courseId: new mongoose.Types.ObjectId(courseId),
      paymentMethod: 'offline',
      paymentStatus: 'pending',
    });
    if (existingPending) {
      return NextResponse.json(
        { success: false, error: 'A pending offline payment already exists for this student and course' },
        { status: 409 },
      );
    }

    const utcTodayStart = new Date();
    utcTodayStart.setUTCHours(0, 0, 0, 0);
    const utcTomorrowStart = new Date(utcTodayStart);
    utcTomorrowStart.setUTCDate(utcTomorrowStart.getUTCDate() + 1);

    const todayCount = await OfflinePayment.countDocuments({
      studentId: new mongoose.Types.ObjectId(studentId),
      paymentMethod: 'offline',
      createdAt: { $gte: utcTodayStart, $lt: utcTomorrowStart },
    });
    if (todayCount >= 5) {
      return NextResponse.json({ success: false, error: 'Too many requests. Try again in 60 seconds' }, { status: 429 });
    }

  const referenceId = await generateReferenceId();

  const offlinePayment = new OfflinePayment({
    studentId: new mongoose.Types.ObjectId(studentId),
    courseId: new mongoose.Types.ObjectId(courseId),
    amount,
    paymentMethod: 'offline',
    offlineMethod: paymentMethod,
    paymentStatus: 'pending',
    offlinePaymentReference: referenceId,
    expectedPaymentDate: expectedPaymentDate ?? undefined,
    notes: notes || undefined,
    currency: 'INR',
  });

  try {
    await offlinePayment.save();
  } catch (error) {
    console.error('Failed to save offline payment', error);
    return NextResponse.json({ success: false, error: 'Failed to create payment request' }, { status: 500 });
  }

  try {
    await PaymentAuditLog.create({
      paymentId: offlinePayment._id,
      action: 'created',
      performedByAdminId: undefined,
      previousValue: null,
      newValue: { status: 'pending' },
      ipAddress: resolveClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      reasonNotes: notes || undefined,
    });
  } catch (auditError) {
    console.error('Could not write audit log for offline payment', auditError);
  }

  const studentName = student.fullName || 'Student';
  const studentEmail = String(student.email || '');
  const courseName = String(course.courseTitle || course.courseCode || 'Course');
  const academyName = process.env.ACADEMY_NAME || 'Little Brushes Academy';
  const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || process.env.SMTP_FROM || 'support@littlebrushes.com';
  const supportPhone = process.env.SUPPORT_PHONE || '+91 99999 99999';

  if (studentEmail) {
    try {
      await sendTransactionalEmail({
        to: studentEmail,
        subject: `Payment Request Created — ${academyName}`,
        html: buildPaymentInstructionEmail({
          studentName,
          courseName,
          referenceId,
          amount,
          expectedPaymentDate: expectedPaymentDate
            ? expectedPaymentDate.toISOString().split('T')[0]
            : undefined,
          academyName,
          supportEmail,
          supportPhone,
        }),
      });
    } catch (emailError) {
      console.error('Failed to send offline payment email', emailError);
    }
  }

  return NextResponse.json(
    {
      success: true,
      payment_id: offlinePayment._id.toString(),
      reference_id: referenceId,
      status: 'pending',
      student_name: studentName,
      student_email: studentEmail,
      course_name: courseName,
      amount,
      created_at: offlinePayment.createdAt.toISOString(),
    },
    { status: 201 },
  );
  } catch (error) {
    console.error('Error in offline payment creation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
