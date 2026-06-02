import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import Course from '@/lib/models/Course';
import OfflinePayment from '@/lib/models/OfflinePayment';
import OfflinePaymentVerification from '@/lib/models/OfflinePaymentVerification';
import PaymentAuditLog from '@/lib/models/PaymentAuditLog';
import { requireAdminFromRequest } from '@/lib/auth/require-admin';
import { sendTransactionalEmail } from '@/lib/email/mailer';
import { sanitizeText } from '@/lib/offline-payment-storage';

export const runtime = 'nodejs';

function resolveClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

function buildRejectedEmailHtml(params: {
  studentName: string;
  courseName: string;
  referenceId: string;
  amount: number;
  rejectionReason: string;
  reasonDetails?: string;
  supportEmail: string;
  supportPhone: string;
}) {
  const { studentName, courseName, referenceId, amount, rejectionReason, reasonDetails, supportEmail, supportPhone } = params;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Payment Verification Issue</title>
</head>
<body style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f4f6fb;color:#111827;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 20px 56px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#dc2626;color:#fff;padding:28px 32px;">
              <h1 style="margin:0;font-size:24px;">Payment Could Not Be Verified</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:16px;margin:0 0 16px;">Hi ${studentName},</p>
              <p style="font-size:15px;line-height:1.7;margin:0 0 22px;">We were unable to verify your offline payment for <strong>${courseName}</strong>.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;">
                <tr><td style="padding:16px;"><strong>Reference ID</strong></td><td style="padding:16px;">${referenceId}</td></tr>
                <tr><td style="padding:16px;"><strong>Amount</strong></td><td style="padding:16px;">₹${amount.toFixed(2)}</td></tr>
                <tr><td style="padding:16px;"><strong>Reason</strong></td><td style="padding:16px;">${rejectionReason}</td></tr>
                ${reasonDetails ? `<tr><td style="padding:16px;"><strong>Details</strong></td><td style="padding:16px;">${reasonDetails}</td></tr>` : ''}
              </table>
              <p style="font-size:15px;line-height:1.7;margin:24px 0 0;">If you have additional information, please contact our support team and we will help you resubmit the payment.</p>
              <p style="font-size:14px;color:#6b7280;line-height:1.7;margin:8px 0 0;">Email: ${supportEmail}<br />Phone: ${supportPhone}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ payment_id: string }> },
) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  await dbConnect();

  const params = await context.params;
  const paymentId = String(params.payment_id || '').trim();
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    return NextResponse.json({ success: false, error: 'Invalid payment id' }, { status: 400 });
  }

  let body: { rejection_reason?: string; reason_details?: string; admin_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const rejectionReason = String(body.rejection_reason || '').trim();
  const reasonDetails = sanitizeText(String(body.reason_details || '').trim());
  const adminId = String(body.admin_id || '').trim();

  if (!rejectionReason) {
    return NextResponse.json({ success: false, error: 'rejection_reason is required' }, { status: 400 });
  }

  const payment = await OfflinePayment.findById(paymentId);
  if (!payment) {
    return NextResponse.json({ success: false, error: `Payment with ID ${paymentId} not found` }, { status: 404 });
  }

  if (payment.paymentStatus !== 'pending') {
    return NextResponse.json({ success: false, error: 'This payment has already been processed' }, { status: 409 });
  }

  const student = await Student.findById(payment.studentId).lean();
  const course = await Course.findById(payment.courseId).lean();
  if (!student || !course) {
    return NextResponse.json({ success: false, error: 'Related student or course record could not be found' }, { status: 500 });
  }

  const adminObjectId = mongoose.Types.ObjectId.isValid(adminId) ? new mongoose.Types.ObjectId(adminId) : undefined;

  const now = new Date();
  payment.paymentStatus = 'rejected';
  payment.paymentReceivedByAdminId = adminObjectId;
  await payment.save();

  await OfflinePaymentVerification.create({
    paymentId: payment._id,
    verificationStatus: 'rejected',
    verifiedByAdminId: adminObjectId,
    verificationNotes: reasonDetails || undefined,
    verifiedAt: now,
  });

  await PaymentAuditLog.create({
    paymentId: payment._id,
    action: 'rejected',
    performedByAdminId: adminObjectId,
    previousValue: { status: 'pending' },
    newValue: { status: 'rejected', reason: rejectionReason },
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || undefined,
    reasonNotes: `${rejectionReason}${reasonDetails ? ` — ${reasonDetails}` : ''}`,
  });

  const studentEmail = String(student.email || '');
  const academyName = process.env.ACADEMY_NAME || 'Little Brushes Academy';
  const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || process.env.SMTP_FROM || 'support@littlebrushes.com';
  const supportPhone = process.env.SUPPORT_PHONE || '+91 99999 99999';

  if (studentEmail) {
    try {
      await sendTransactionalEmail({
        to: studentEmail,
        subject: `Payment Verification Issue for ${course.courseTitle}`,
        html: buildRejectedEmailHtml({
          studentName: student.fullName,
          courseName: course.courseTitle,
          referenceId: payment.offlinePaymentReference || 'N/A',
          amount: payment.amount,
          rejectionReason,
          reasonDetails,
          supportEmail,
          supportPhone,
        }),
      });
    } catch (emailError) {
      console.error('Failed to send rejection email', emailError);
    }
  }

  return NextResponse.json(
    {
      success: true,
      payment_id: payment._id.toString(),
      reference_id: payment.offlinePaymentReference || null,
      status: 'rejected',
      student_email: student.email || null,
      rejection_reason: rejectionReason,
      reason_details: reasonDetails || null,
      student_notification: studentEmail ? `Rejection email sent to ${studentEmail}` : 'No email address available for student',
    },
    { status: 200 },
  );
}
