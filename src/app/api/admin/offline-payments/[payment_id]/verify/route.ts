import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import Course from '@/lib/models/Course';
import OfflinePayment from '@/lib/models/OfflinePayment';
import OfflinePaymentVerification from '@/lib/models/OfflinePaymentVerification';
import CourseEnrollment from '@/lib/models/CourseEnrollment';
import PaymentAuditLog from '@/lib/models/PaymentAuditLog';
import { requireAdminFromRequest } from '@/lib/auth/require-admin';
import { sendTransactionalEmail } from '@/lib/email/mailer';
import { saveEvidenceFile, sanitizeText, getEvidenceStorageRoot } from '@/lib/offline-payment-storage';

export const runtime = 'nodejs';

const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function buildVerifiedEmailHtml(params: {
  studentName: string;
  courseName: string;
  referenceId: string;
  amount: number;
  verifiedDate: string;
  accessUrl: string;
  certificateUrl: string;
  supportEmail: string;
  supportPhone: string;
}) {
  const {
    studentName,
    courseName,
    referenceId,
    amount,
    verifiedDate,
    accessUrl,
    certificateUrl,
    supportEmail,
    supportPhone,
  } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Payment Verified</title>
</head>
<body style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f4f6fb;color:#111827;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 20px 56px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#16a34a;color:#fff;padding:28px 32px;">
              <h1 style="margin:0;font-size:24px;">Payment Verified!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:16px;margin:0 0 16px;">Hi ${studentName},</p>
              <p style="font-size:15px;line-height:1.7;margin:0 0 22px;">Your payment for <strong>${courseName}</strong> has been verified and your course access is now active.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;">
                <tr><td style="padding:16px;"><strong>Reference ID</strong></td><td style="padding:16px;">${referenceId}</td></tr>
                <tr><td style="padding:16px;"><strong>Amount</strong></td><td style="padding:16px;">₹${amount.toFixed(2)}</td></tr>
                <tr><td style="padding:16px;"><strong>Verified on</strong></td><td style="padding:16px;">${verifiedDate}</td></tr>
              </table>
              <p style="font-size:15px;line-height:1.7;margin:24px 0 24px;">You can access your course immediately using the links below.</p>
              <p style="margin:0 0 12px;"><a href="${accessUrl}" style="color:#1d4ed8;">Access Your Course</a></p>
              <p style="margin:0 0 12px;"><a href="${certificateUrl}" style="color:#1d4ed8;">View Certificate</a></p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />
              <p style="font-size:14px;color:#6b7280;line-height:1.7;margin:0;">Need help? Email us at ${supportEmail} or call ${supportPhone}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildRejectedEmailHtml(params: {
  studentName: string;
  courseName: string;
  referenceId: string;
  amount: number;
  reason: string;
  supportEmail: string;
  supportPhone: string;
}) {
  const { studentName, courseName, referenceId, amount, reason, supportEmail, supportPhone } = params;

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
              <p style="font-size:15px;line-height:1.7;margin:0 0 22px;">We could not verify your payment for <strong>${courseName}</strong>.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;">
                <tr><td style="padding:16px;"><strong>Reference ID</strong></td><td style="padding:16px;">${referenceId}</td></tr>
                <tr><td style="padding:16px;"><strong>Amount</strong></td><td style="padding:16px;">₹${amount.toFixed(2)}</td></tr>
                <tr><td style="padding:16px;"><strong>Reason</strong></td><td style="padding:16px;">${reason}</td></tr>
              </table>
              <p style="font-size:15px;line-height:1.7;margin:24px 0 0;">If you believe this was a mistake, please contact support.</p>
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

function resolveClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

function buildAccessUrl(course: { courseCode?: string; _id: mongoose.Types.ObjectId }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
  if (course.courseCode) {
    return `${baseUrl}/courses/${encodeURIComponent(course.courseCode)}`;
  }
  return `${baseUrl}/courses/${course._id.toString()}`;
}

function buildCertificateUrl(studentId: mongoose.Types.ObjectId) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
  return `${baseUrl}/certificate/${studentId.toString()}`;
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

  const formData = await request.formData();
  const verificationStatus = String(formData.get('verification_status') || '').trim().toLowerCase();
  const verificationNotes = sanitizeText(String(formData.get('verification_notes') || '').trim());
  const adminId = String(formData.get('admin_id') || '').trim();
  const providedEvidence = formData.get('evidence_file');

  if (!['verified', 'rejected'].includes(verificationStatus)) {
    return NextResponse.json({ success: false, error: 'verification_status must be verified or rejected' }, { status: 400 });
  }

  const evidenceFile = providedEvidence instanceof Blob ? providedEvidence : null;

  if (evidenceFile) {
    const fileType = String(evidenceFile.type || '').toLowerCase();
    const fileSize = Number(evidenceFile.size || 0);
    if (!ALLOWED_FILE_TYPES.includes(fileType)) {
      return NextResponse.json({ success: false, error: 'Invalid file type. Only PDF, JPG, JPEG, PNG are allowed' }, { status: 400 });
    }
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'File size exceeds 10MB limit' }, { status: 400 });
    }
  }

  const payment = await OfflinePayment.findById(paymentId);
  if (!payment) {
    return NextResponse.json({ success: false, error: `Payment with ID ${paymentId} not found` }, { status: 404 });
  }

  if (payment.paymentStatus !== 'pending') {
    return NextResponse.json({ success: false, error: 'This payment has already been verified. Cannot verify twice.' }, { status: 409 });
  }

  if (payment.paymentMethod !== 'offline') {
    return NextResponse.json({ success: false, error: 'Only offline payments may be verified through this endpoint' }, { status: 400 });
  }

  const student = await Student.findById(payment.studentId).lean();
  const course = await Course.findById(payment.courseId).lean();
  if (!student || !course) {
    return NextResponse.json({ success: false, error: 'Related student or course record could not be found' }, { status: 500 });
  }

  const now = new Date();
  let evidenceEncryptedPath: string | undefined;

  try {
    if (evidenceFile) {
      const saved = await saveEvidenceFile(paymentId, evidenceFile);
      evidenceEncryptedPath = saved.encryptedPath;
    }
  } catch (error) {
    console.error('Failed to save evidence file', error);
    return NextResponse.json({ success: false, error: 'Failed to store evidence file' }, { status: 500 });
  }

  const adminObjectId = mongoose.Types.ObjectId.isValid(adminId) ? new mongoose.Types.ObjectId(adminId) : undefined;
  const studentEmail = String(student.email || '');
  const referenceId = payment.offlinePaymentReference || '';

  let enrollmentRecord;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    payment.paymentStatus = verificationStatus === 'verified' ? 'completed' : 'rejected';
    if (verificationStatus === 'verified') {
      payment.completedAt = now;
      payment.paymentReceivedByAdminId = adminObjectId;
      payment.offlinePaymentDate = now;
    }
    await payment.save({ session });

    await OfflinePaymentVerification.create([
      {
        paymentId: payment._id,
        verificationStatus: verificationStatus === 'verified' ? 'verified' : 'rejected',
        verifiedByAdminId: adminObjectId,
        evidenceFilePath: evidenceEncryptedPath,
        verificationNotes: verificationNotes || undefined,
        verifiedAt: now,
      },
    ], { session });

    await PaymentAuditLog.create([
      {
        paymentId: payment._id,
        action: verificationStatus === 'verified' ? 'verified' : 'rejected',
        performedByAdminId: adminObjectId,
        previousValue: { status: 'pending' },
        newValue: { status: payment.paymentStatus },
        ipAddress: resolveClientIp(request),
        userAgent: request.headers.get('user-agent') || undefined,
        reasonNotes: verificationNotes || undefined,
      },
    ], { session });

    if (verificationStatus === 'verified') {
      const existingEnrollment = await CourseEnrollment.findOne({
        studentId: payment.studentId,
        courseId: payment.courseId,
      }).session(session);

      if (existingEnrollment) {
        enrollmentRecord = existingEnrollment;
      } else {
        enrollmentRecord = await CourseEnrollment.create([
          {
            studentId: payment.studentId,
            courseId: payment.courseId,
            enrollmentDate: now,
            status: 'active',
            completionPercentage: 0,
            paymentId: payment._id.toString(),
            amount: payment.amount,
            paymentStatus: payment.paymentStatus,
            paymentMethod: 'offline',
          },
        ], { session });
        enrollmentRecord = enrollmentRecord[0];
      }

      await PaymentAuditLog.create([
        {
          paymentId: payment._id,
          action: 'access_granted',
          performedByAdminId: adminObjectId,
          previousValue: null,
          newValue: { enrollment_id: enrollmentRecord._id.toString() },
          ipAddress: resolveClientIp(request),
          userAgent: request.headers.get('user-agent') || undefined,
          reasonNotes: 'Offline payment verified and course access granted',
        },
      ], { session });
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error('Failed to verify offline payment', error);
    return NextResponse.json({ success: false, error: 'Failed to verify payment' }, { status: 500 });
  } finally {
    session.endSession();
  }

  const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || process.env.SMTP_FROM || 'support@littlebrushes.com';
  const supportPhone = process.env.SUPPORT_PHONE || '+91 99999 99999';
  const accessUrl = buildAccessUrl(course);
  const certificateUrl = buildCertificateUrl(payment.studentId as mongoose.Types.ObjectId);

  try {
    if (studentEmail) {
      if (verificationStatus === 'verified') {
        await sendTransactionalEmail({
          to: studentEmail,
          subject: `✓ Payment Verified for ${course.courseTitle}`,
          html: buildVerifiedEmailHtml({
            studentName: student.fullName,
            courseName: course.courseTitle,
            referenceId,
            amount: payment.amount,
            verifiedDate: now.toISOString(),
            accessUrl,
            certificateUrl,
            supportEmail,
            supportPhone,
          }),
        });
      } else {
        await sendTransactionalEmail({
          to: studentEmail,
          subject: `Payment Verification Issue for ${course.courseTitle}`,
          html: buildRejectedEmailHtml({
            studentName: student.fullName,
            courseName: course.courseTitle,
            referenceId,
            amount: payment.amount,
            reason: verificationNotes || 'Verification could not be completed',
            supportEmail,
            supportPhone,
          }),
        });
      }
    }
  } catch (emailError) {
    console.error('Failed to send payment verification email', emailError);
  }

  return NextResponse.json(
    {
      success: true,
      payment_id: payment._id.toString(),
      reference_id: referenceId,
      verification_status: verificationStatus,
      student_name: student.fullName,
      course_name: course.courseTitle,
      enrollment_id: verificationStatus === 'verified' ? enrollmentRecord?._id.toString() : null,
      enrollment_status: verificationStatus === 'verified' ? 'active' : null,
      access_url: verificationStatus === 'verified' ? accessUrl : null,
      certificate_url: verificationStatus === 'verified' ? certificateUrl : null,
      student_notification: studentEmail ? 'Email sent to ' + studentEmail : 'No email address available for student',
      verified_at: now.toISOString(),
      evidence_storage_root: getEvidenceStorageRoot(),
    },
    { status: 200 },
  );
}
