import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import CourseEnrollment from '@/lib/models/CourseEnrollment';
import Course from '@/lib/models/Course';
import Student from '@/lib/models/Student';
import { requireStudentFromRequest } from '@/lib/auth/require-student';
import { generateEnrollmentInvoicePdf } from '@/lib/invoice';

type CourseDocument = {
  _id: mongoose.Types.ObjectId;
  courseTitle: string;
  courseCode: string;
  duration?: number;
  image?: string;
  totalFees?: number;
  discountPercentage?: number;
};

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireStudentFromRequest(request);
  if (!auth.ok) return auth.response;

  const enrollmentId = request.nextUrl.searchParams.get('enrollmentId');
  if (!enrollmentId || !mongoose.Types.ObjectId.isValid(enrollmentId)) {
    return NextResponse.json({ error: 'Invalid enrollment ID' }, { status: 400 });
  }

  await dbConnect();

  const enrollment = await CourseEnrollment.findOne({
    _id: enrollmentId,
    studentId: new mongoose.Types.ObjectId(auth.student.id),
  }).populate('courseId');

  if (!enrollment) {
    return NextResponse.json({ error: 'Invoice not found or access denied' }, { status: 404 });
  }

  const student = await Student.findById(auth.student.id);
  if (!student) {
    return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
  }

  const course = enrollment.courseId as unknown as CourseDocument | null;
  if (!course || !course.courseTitle) {
    return NextResponse.json({ error: 'Course data unavailable' }, { status: 404 });
  }

  const invoiceId = enrollment.invoiceId || `INV-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  if (!enrollment.invoiceId) {
    enrollment.invoiceId = invoiceId;
    enrollment.invoiceGeneratedAt = new Date();
    await enrollment.save();
  }

  const courseTitleSlug = course.courseTitle.replace(/\s+/g, '-').toLowerCase();
  const studentNameSlug = student.fullName.replace(/\s+/g, '-').toLowerCase();
  const filename = `invoice-${courseTitleSlug}-${studentNameSlug}.pdf`;

  const pdfBuffer = await generateEnrollmentInvoicePdf({
    invoiceId,
    academyName: 'Little Brushes Art Academy',
    studentName: student.fullName,
    studentEmail: student.email || '',
    courseTitle: course.courseTitle,
    courseCode: course.courseCode,
    courseDurationMonths: course.duration || 0,
    amountPaid: enrollment.amount || 0,
    discountPercentage: enrollment.discountPercentage ?? course.discountPercentage ?? 0,
    discountAmount: enrollment.discountAmount ?? Math.max(0, (course.totalFees ?? 0) - (enrollment.amount ?? 0)),
    paymentMethod: enrollment.paymentMethod || 'Razorpay',
    transactionId: enrollment.paymentId || '',
    orderId: enrollment.orderId || '',
    purchaseDate: enrollment.enrollmentDate.toISOString(),
    taxAmount: enrollment.taxAmount ?? 0,
    supportEmail: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'support@littlebrushes.com',
    supportPhone: process.env.SUPPORT_PHONE || '+91 90000 00000',
    gstNumber: process.env.GST_NUMBER,
  });

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
