import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Batch, { type BatchDocument } from '@/lib/models/Batch';
import { serializeBatch } from '@/lib/serializers/batchSerialize';
import { requireAdminFromRequest } from '@/lib/auth/require-admin';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdminFromRequest(request);
    if (!auth.ok) return auth.response;

    const { id: studentId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 });
    }

    await dbConnect();

    // Find a batch that contains this student. Prefer active batches and most recent.
    const oid = new mongoose.Types.ObjectId(studentId);

    const batch = await Batch.findOne({ 'students.studentId': oid }).sort({ updatedAt: -1 }).lean();

    if (!batch) {
      return NextResponse.json({ success: true, data: { batch: null } }, { status: 200 });
    }

    const serialized = serializeBatch(batch as BatchDocument);

    return NextResponse.json({ success: true, data: { batch: serialized } }, { status: 200 });
  } catch (err) {
    console.error('[admin student batch]', err);
    return NextResponse.json({ success: false, error: 'Failed to load batch' }, { status: 500 });
  }
}
