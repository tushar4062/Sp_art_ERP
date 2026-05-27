import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import CourseEnrollment from '@/lib/models/CourseEnrollment';
import Course from '@/lib/models/Course';
import Student from '@/lib/models/Student';
import { requireStudentFromRequest } from '@/lib/auth/require-student';
import { sendCourseEnrollmentEmail } from '@/lib/email/courseEnrollmentEmail';

type VerifyPaymentRequest = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  amount?: number | string;
  courseId: string;
};

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    // DEBUG: Log incoming request
    console.log('\n');
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║      PAYMENT VERIFY API - START           ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    const auth = await requireStudentFromRequest(request);
    console.log(`✓ Auth check: ${auth.ok ? 'SUCCESS' : 'FAILED'}`);
    
    if (!auth.ok) {
      console.log('✗ Auth failed, returning 401');
      return auth.response;
    }

    console.log(`  Student ID: ${auth.student.id}`);

    const body = (await request.json()) as VerifyPaymentRequest;
    console.log(`✓ Body parsed`);
    console.log(`  Body keys: ${Object.keys(body).join(', ')}`);
    
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, courseId } = body;

    // Validate required fields
    const missingFields = [];
    if (!razorpay_order_id) missingFields.push('razorpay_order_id');
    if (!razorpay_payment_id) missingFields.push('razorpay_payment_id');
    if (!razorpay_signature) missingFields.push('razorpay_signature');
    if (!courseId) missingFields.push('courseId');

    if (missingFields.length > 0) {
      console.log(`✗ Missing fields: ${missingFields.join(', ')}`);
      return NextResponse.json({ 
        error: 'Missing payment verification fields',
        missing: missingFields
      }, { status: 400 });
    }

    console.log(`✓ All required fields present`);

    // Verify Razorpay signature
    console.log(`\n→ Verifying Razorpay signature...`);
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!secret) {
      console.error(`✗ RAZORPAY_KEY_SECRET not configured`);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const message = `${razorpay_order_id}|${razorpay_payment_id}`;
    console.log(`  Message to verify: ${message}`);
    console.log(`  Secret key length: ${secret.length}`);
    
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');

    console.log(`  Provided signature:  ${razorpay_signature.substring(0, 20)}...`);
    console.log(`  Generated signature: ${generated_signature.substring(0, 20)}...`);
    
    const signatureMatch = generated_signature === razorpay_signature;
    console.log(`  Match: ${signatureMatch ? '✓ YES' : '✗ NO'}`);

    if (!signatureMatch) {
      console.error(`✗ Signature verification failed!`);
      console.error(`  Full provided:  ${razorpay_signature}`);
      console.error(`  Full generated: ${generated_signature}`);
      return NextResponse.json({ 
        error: 'Invalid signature',
        providedLength: razorpay_signature.length,
        generatedLength: generated_signature.length
      }, { status: 400 });
    }

    // Connect to database
    console.log(`\n→ Connecting to database...`);
    try {
      await dbConnect();
      console.log(`✓ Database connected`);
    } catch (dbErr) {
      console.error(`✗ Database connection failed: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`);
      return NextResponse.json({ 
        error: 'Database connection failed',
        dbError: dbErr instanceof Error ? dbErr.message : String(dbErr)
      }, { status: 500 });
    }

    // Validate courseId is valid ObjectId
    console.log(`\n→ Validating courseId...`);
    console.log(`  courseId value: ${courseId}`);
    console.log(`  courseId type: ${typeof courseId}`);
    
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      console.error(`✗ Invalid courseId format`);
      return NextResponse.json({ error: 'Invalid courseId format' }, { status: 400 });
    }
    console.log(`✓ courseId is valid ObjectId`);

    // Prevent duplicate enrollments for same payment/order
    console.log(`\n→ Checking for duplicate enrollment...`);
    console.log(`  Looking for orderId: ${razorpay_order_id}`);
    
    const existing = await CourseEnrollment.findOne({ orderId: razorpay_order_id });
    if (existing) {
      console.log(`✓ Enrollment already exists for this order`);
      console.log(`  Existing ID: ${existing._id}`);
      return NextResponse.json({ 
        success: true, 
        message: 'Already processed', 
        enrollmentId: existing._id.toString() 
      });
    }
    console.log(`✓ No duplicate found`);

    // Load course details for invoice metadata
    console.log(`\n→ Loading course details for invoice...`);
    const course = await Course.findById(courseId);
    if (!course) {
      console.error(`✗ Course not found for courseId ${courseId}`);
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const studentId = new mongoose.Types.ObjectId(auth.student.id);
    const courseIdObj = new mongoose.Types.ObjectId(courseId);
    const amountPaid = Number(amount || 0);
    const discountAmount = Math.max(0, (course.totalFees ?? 0) - amountPaid);
    const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const supportEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'support@littlebrushes.com';
    const supportPhone = process.env.SUPPORT_PHONE || '+91 90000 00000';

    const payload = {
      studentId,
      courseId: courseIdObj,
      enrollmentDate: new Date(),
      status: 'active' as const,
      completionPercentage: 0,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: amountPaid,
      paymentStatus: 'paid' as const,
      paymentMethod: 'Razorpay',
      discountPercentage: course.discountPercentage ?? 0,
      discountAmount,
      taxAmount: 0,
      invoiceId,
      invoiceGeneratedAt: new Date(),
    };

    console.log(`✓ Payload prepared:`);
    console.log(`  {`);
    console.log(`    studentId: ${payload.studentId}`);
    console.log(`    courseId: ${payload.courseId}`);
    console.log(`    status: ${payload.status}`);
    console.log(`    paymentStatus: ${payload.paymentStatus}`);
    console.log(`    amount: ${payload.amount}`);
    console.log(`    orderId: ${payload.orderId}`);
    console.log(`    paymentId: ${payload.paymentId}`);
    console.log(`  }`);

    // Create enrollment
    console.log(`\n→ Creating enrollment in MongoDB...`);
    let enrollment;
    try {
      enrollment = await CourseEnrollment.create(payload);
      console.log(`✓ Enrollment created successfully!`);
      console.log(`  Enrollment ID: ${enrollment._id}`);
      console.log(`  Created At: ${enrollment.createdAt}`);
    } catch (createErr: unknown) {
      console.error(`✗ Failed to create enrollment`);
      if (createErr instanceof Error) {
        console.error(`  Error type: ${createErr.constructor.name}`);
        console.error(`  Error message: ${createErr.message}`);
      } else {
        console.error(`  Non-error thrown: ${String(createErr)}`);
      }

      const isDuplicateKeyError =
        typeof createErr === 'object' &&
        createErr !== null &&
        'code' in createErr &&
        (createErr as { code: unknown }).code === 11000;

      if (isDuplicateKeyError) {
        console.error(`  Duplicate key error during enrollment creation`);
      }

      return NextResponse.json({
        error: 'Failed to create enrollment',
        errorType:
          createErr instanceof Error
            ? createErr.constructor.name
            : 'UnknownError',
        errorMessage:
          createErr instanceof Error ? createErr.message : String(createErr),
      }, { status: 500 });
    }

    // Verify enrollment was saved
    console.log(`\n→ Verifying enrollment in database...`);
    const verified = await CourseEnrollment.findById(enrollment._id);
    if (!verified) {
      console.error(`✗ Enrollment not found after creation!`);
      return NextResponse.json({ 
        error: 'Enrollment creation verification failed'
      }, { status: 500 });
    }
    console.log(`✓ Enrollment verified in database`);

    // Send invoice email to student
    try {
      const student = await Student.findById(auth.student.id);
      if (student?.email) {
        await sendCourseEnrollmentEmail({
          studentEmail: student.email,
          studentName: student.fullName,
          courseTitle: course.courseTitle,
          courseCode: course.courseCode,
          enrollmentDate: enrollment.enrollmentDate.toISOString(),
          amountPaid,
          paymentMethod: 'Razorpay',
          transactionId: razorpay_payment_id,
          orderId: razorpay_order_id,
          invoiceId: invoiceId,
          supportEmail,
          supportPhone,
          courseDurationMonths: course.duration,
          discountPercentage: course.discountPercentage ?? 0,
          discountAmount,
          gstNumber: process.env.GST_NUMBER,
        });
        console.log('✓ Enrollment invoice email sent successfully');
      } else {
        console.warn('⚠️ Student record missing email; skipping invoice email');
      }
    } catch (mailErr) {
      console.error('✗ Failed to send enrollment invoice email:', mailErr instanceof Error ? mailErr.message : String(mailErr));
    }

    const duration = Date.now() - startTime;
    console.log(`\n✓ ✓ ✓ PAYMENT VERIFICATION COMPLETE ✓ ✓ ✓`);
    console.log(`Duration: ${duration}ms`);
    console.log('');

    return NextResponse.json({ 
      success: true, 
      enrollmentId: enrollment._id.toString(),
      message: 'Enrollment saved successfully'
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('\n');
    console.error('╔═══════════════════════════════════════════╗');
    console.error('║    PAYMENT VERIFY API - ERROR             ║');
    console.error('╚═══════════════════════════════════════════╝');
    console.error(`Timestamp: ${new Date().toISOString()}`);
    console.error(`Duration: ${duration}ms`);
    console.error(`Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`Error message: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`Stack trace:\n${error.stack}`);
    }
    console.error(`Full error: ${JSON.stringify(error)}`);
    console.error('');
    
    if (error instanceof Error && error.message.includes('duplicate')) {
      return NextResponse.json({ 
        error: 'Duplicate enrollment detected. Student already enrolled in this course.' 
      }, { status: 409 });
    }

    return NextResponse.json({ 
      error: 'Payment verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
