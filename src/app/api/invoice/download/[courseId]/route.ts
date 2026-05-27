import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import CourseEnrollment from '@/lib/models/CourseEnrollment';
import Course from '@/lib/models/Course';
import Student from '@/lib/models/Student';
import { requireStudentFromRequest } from '@/lib/auth/require-student';
import { generateEnrollmentInvoicePdf } from '@/lib/invoice';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ courseId?: string }> }) {
  const auth = await requireStudentFromRequest(request);
  if (!auth.ok) return auth.response;

  const { courseId } = await params;
  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
  }

  try {
    await dbConnect();

    // Ensure Course model is registered
    const CourseModel = Course;

    const enrollment = await CourseEnrollment.findOne({
      courseId: new mongoose.Types.ObjectId(courseId),
      studentId: new mongoose.Types.ObjectId(auth.student.id),
    })
      .sort({ enrollmentDate: -1 });

    if (!enrollment) {
      return NextResponse.json({ error: 'Invoice not found or access denied' }, { status: 404 });
    }

    // Fetch course separately to avoid populate schema issues
    const course = await CourseModel.findById(enrollment.courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course data unavailable' }, { status: 404 });
    }

    const student = await Student.findById(auth.student.id);
    if (!student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    const invoiceId = enrollment.invoiceId ?? `INV-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    if (!enrollment.invoiceId) {
      enrollment.invoiceId = invoiceId;
      enrollment.invoiceGeneratedAt = new Date();
      await enrollment.save();
    }

    const cleanCourseTitle = String(course.courseTitle || 'course').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase();
    const cleanStudentName = String(student.fullName || 'student').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase();
    const filename = `invoice-${cleanCourseTitle}-${cleanStudentName}.pdf`;

    const pdfBuffer = await generateEnrollmentInvoicePdf({
      invoiceId,
      academyName: 'Little Brushes Art Academy',
      studentName: String(student.fullName || 'Student Name'),
      studentEmail: student.email || '',
      courseTitle: String(course.courseTitle || 'Course Title'),
      courseCode: String(course.courseCode || 'N/A'),
      courseDurationMonths: Number(course.duration ?? 0),
      amountPaid: Number(enrollment.amount ?? 0),
      discountPercentage: Number(enrollment.discountPercentage ?? course.discountPercentage ?? 0),
      discountAmount: Number(enrollment.discountAmount ?? Math.max(0, Number(course.totalFees ?? 0) - Number(enrollment.amount ?? 0))),
      paymentMethod: enrollment.paymentMethod || 'Razorpay',
      transactionId: enrollment.paymentId || '',
      orderId: enrollment.orderId || '',
      purchaseDate: enrollment.enrollmentDate ? enrollment.enrollmentDate.toISOString() : new Date().toISOString(),
      taxAmount: Number(enrollment.taxAmount ?? 0),
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
  } catch (error) {
    console.error('Invoice download error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate invoice',
      },
      { status: 500 }
    );
  }
}
