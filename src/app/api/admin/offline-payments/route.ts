import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import Course from '@/lib/models/Course';
import OfflinePayment from '@/lib/models/OfflinePayment';
import { requireAdminFromRequest } from '@/lib/auth/require-admin';

export const runtime = 'nodejs';

function mapStatusQuery(status: string | null) {
  if (!status) return null;
  const normalized = status.toLowerCase();
  if (normalized === 'verified') return 'completed';
  if (['pending', 'rejected', 'completed'].includes(normalized)) return normalized;
  return null;
}

function resolveClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  await dbConnect();

  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const statusFilter = mapStatusQuery(searchParams.get('status'));
  const paymentMethod = String(searchParams.get('payment_method') || '').trim().toLowerCase();
  const search = String(searchParams.get('search') || '').trim();
  const sortBy = String(searchParams.get('sort_by') || 'created_at').trim().toLowerCase();
  const sortOrder = String(searchParams.get('sort_order') || 'desc').trim().toLowerCase() === 'asc' ? 1 : -1;
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || '20'), 1), 100);
  const offset = Math.max(Number(searchParams.get('offset') || '0'), 0);
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const adminId = String(searchParams.get('admin_id') || '').trim();

  const filter: Record<string, unknown> = {};
  if (statusFilter) filter.paymentStatus = statusFilter;
  if (paymentMethod && ['cash', 'cheque', 'bank_transfer'].includes(paymentMethod)) {
    filter.offlineMethod = paymentMethod;
  }
  if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
    filter.paymentReceivedByAdminId = new mongoose.Types.ObjectId(adminId);
  }
  if (dateFrom || dateTo) {
    const createdAtFilter: Record<string, unknown> = {};
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      if (!Number.isNaN(fromDate.getTime())) {
        createdAtFilter.$gte = fromDate;
      }
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      if (!Number.isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        createdAtFilter.$lte = toDate;
      }
    }
    if (Object.keys(createdAtFilter).length > 0) {
      filter.createdAt = createdAtFilter;
    }
  }

  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { offlinePaymentReference: regex },
      { notes: regex },
    ];
  }

  const baseCountFilter = { ...filter } as Record<string, unknown>;
  if (filter.$or && !Array.isArray(filter.$or)) {
    delete baseCountFilter.$or;
  }

  const pendingCountPromise = OfflinePayment.countDocuments({
    ...(baseCountFilter as Record<string, unknown>),
    paymentStatus: 'pending',
  } as Record<string, unknown>);
  const verifiedCountPromise = OfflinePayment.countDocuments({
    ...(baseCountFilter as Record<string, unknown>),
    paymentStatus: 'completed',
  } as Record<string, unknown>);
  const rejectedCountPromise = OfflinePayment.countDocuments({
    ...(baseCountFilter as Record<string, unknown>),
    paymentStatus: 'rejected',
  } as Record<string, unknown>);
  const totalCountPromise = OfflinePayment.countDocuments(filter as Record<string, unknown>);

  const sortFields: Record<string, number> = {
    created_at: sortOrder,
    status: sortOrder,
    amount: sortOrder,
  };
  const sortKey = sortFields[sortBy] !== undefined ? sortBy : 'created_at';
  const sort: Record<string, 1 | -1> = {};
  if (sortKey === 'status') {
    sort.paymentStatus = sortOrder as 1 | -1;
  } else if (sortKey === 'amount') {
    sort.amount = sortOrder as 1 | -1;
  } else {
    sort.createdAt = sortOrder as 1 | -1;
  }

  const [pending_count, verified_count, rejected_count, total] = await Promise.all([
    pendingCountPromise,
    verifiedCountPromise,
    rejectedCountPromise,
    totalCountPromise,
  ]);

  const payments = await OfflinePayment.find(filter as Record<string, unknown>)
    .populate({ path: 'studentId', model: Student })
    .populate({ path: 'courseId', model: Course })
    .sort(sort)
    .skip(offset)
    .limit(limit)
    .lean();

  const now = new Date();
  const formattedPayments = payments.map(payment => {
    const student = payment.studentId as { _id?: mongoose.Types.ObjectId; fullName?: string; email?: string } | null;
    const course = payment.courseId as { _id?: mongoose.Types.ObjectId; courseTitle?: string; courseCode?: string } | null;
    const createdAt = payment.createdAt ? new Date(payment.createdAt) : new Date();
    const hoursPending = payment.paymentStatus === 'pending'
      ? Math.floor((now.getTime() - createdAt.getTime()) / 3600000)
      : 0;
    return {
      payment_id: payment._id.toString(),
      reference_id: payment.offlinePaymentReference || null,
      student_id: student?._id?.toString() || payment.studentId?.toString(),
      student_name: student?.fullName || 'Unknown',
      student_email: student?.email || null,
      course_id: course?._id?.toString() || payment.courseId?.toString(),
      course_name: course?.courseTitle || course?.courseCode || 'Unknown',
      amount: payment.amount,
      currency: payment.currency,
      payment_method: payment.offlineMethod,
      payment_status: payment.paymentStatus === 'completed' ? 'verified' : payment.paymentStatus,
      created_at: payment.createdAt?.toISOString() || null,
      expected_payment_date: payment.expectedPaymentDate?.toISOString() || null,
      verified_at: payment.completedAt?.toISOString() || null,
      verified_by_admin_id: payment.paymentReceivedByAdminId?.toString() || null,
      verified_by_admin_name: null,
      hours_pending: hoursPending,
      is_overdue: payment.paymentStatus === 'pending' ? hoursPending > 48 : false,
      notes: payment.notes || null,
    };
  });

  return NextResponse.json({
    success: true,
    total,
    pending_count,
    verified_count,
    rejected_count,
    limit,
    offset,
    payments: formattedPayments,
  });
}
