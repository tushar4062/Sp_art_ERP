import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { requireStudentFromRequest } from '@/lib/auth/require-student';
import { assertRazorpayConfigured } from '@/lib/razorpay/config';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║   CREATE PAYMENT ORDER API - START        ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log(`Timestamp: ${new Date().toISOString()}`);

    const auth = await requireStudentFromRequest(request);
    console.log(`✓ Auth check: ${auth.ok ? 'SUCCESS' : 'FAILED'}`);
    
    if (!auth.ok) {
      console.log('✗ Auth failed, returning 401');
      return auth.response;
    }

    console.log(`  Student ID: ${auth.student.id}`);

    const body = await request.json();
    console.log(`✓ Body parsed`);
    console.log(`  Body keys: ${Object.keys(body).join(', ')}`);

    const amount = Number(body?.amount);
    const courseId = typeof body?.courseId === 'string' ? body.courseId.trim() : '';

    console.log(`✓ Extracted values:`);
    console.log(`  amount: ${amount} (type: ${typeof amount})`);
    console.log(`  courseId: ${courseId} (type: ${typeof courseId})`);

    // Validate amount
    if (!Number.isFinite(amount) || amount <= 0) {
      console.error(`✗ Invalid amount: ${amount}`);
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    console.log(`✓ Amount is valid and > 0`);

    // Validate courseId
    if (!courseId) {
      console.error(`✗ Missing courseId`);
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }
    console.log(`✓ courseId present`);

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      console.error(`✗ Invalid courseId format: ${courseId}`);
      return NextResponse.json({ error: 'Invalid courseId format' }, { status: 400 });
    }
    console.log(`✓ courseId is valid ObjectId`);

    // Connect to database
    console.log(`\n→ Connecting to database...`);
    try {
      await dbConnect();
      console.log(`✓ Database connected`);
    } catch (dbErr) {
      console.error(`✗ Database connection failed: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Initialize Razorpay
    console.log(`\n→ Initializing Razorpay...`);
    let razorpayKeyId: string;
    let razorpayKeySecret: string;
    try {
      ({ keyId: razorpayKeyId, keySecret: razorpayKeySecret } = assertRazorpayConfigured());
    } catch {
      console.error(`✗ Razorpay credentials missing in .env`);
      return NextResponse.json(
        { error: 'Payment gateway is not configured. Contact admin.' },
        { status: 503 },
      );
    }

    console.log(`✓ Razorpay credentials found`);
    console.log(`  Key ID: ${razorpayKeyId.substring(0, 15)}...`);

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });
    console.log(`✓ Razorpay SDK initialized`);

    // Create order
    console.log(`\n→ Creating Razorpay order...`);
    const orderAmount = Math.round(amount * 100); // amount in paise
    const receipt = `rcpt_${Date.now()}`;

    console.log(`  Amount in rupees: ₹${amount}`);
    console.log(`  Amount in paise: ${orderAmount}`);
    console.log(`  Receipt: ${receipt}`);
    console.log(`  Student ID: ${auth.student.id}`);
    console.log(`  Course ID: ${courseId}`);

    const order = await razorpay.orders.create({
      amount: orderAmount,
      currency: 'INR',
      receipt,
      notes: { 
        courseId, 
        studentId: auth.student.id,
      },
    });

    console.log(`✓ Razorpay order created successfully!`);
    console.log(`  Order ID: ${order.id}`);
    console.log(`  Order status: ${order.status}`);
    const parsedOrderAmount = Number(order.amount);
    console.log(`  Amount: ₹${Number.isFinite(parsedOrderAmount) ? parsedOrderAmount / 100 : 'unknown'}`);

    const duration = Date.now() - startTime;
    console.log(`\n✓ ✓ ✓ ORDER CREATION COMPLETE ✓ ✓ ✓`);
    console.log(`Duration: ${duration}ms`);
    console.log('');

    return NextResponse.json({ order, keyId: razorpayKeyId });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('\n');
    console.error('╔═══════════════════════════════════════════╗');
    console.error('║  CREATE PAYMENT ORDER API - ERROR         ║');
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
    
    return NextResponse.json({ 
      error: 'Failed to create order',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
