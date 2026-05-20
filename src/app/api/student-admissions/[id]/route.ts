import dbConnect from '@/lib/mongodb';
import StudentAdmission from '@/lib/models/StudentAdmission';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await dbConnect();
  try {
    const admission = await StudentAdmission.findById(id).lean();
    if (!admission) {
      return NextResponse.json({ success: false, error: 'Admission not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, item: admission });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: 'Failed to load admission' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await dbConnect();
  try {
    const body = await req.json();
    
    const updated = await StudentAdmission.findByIdAndUpdate(
      id,
      {
        fullName: body.fullName,
        className: body.className,
        email: body.email,
        mobile: body.mobile,
        parentName: body.parentName,
        parentMobile: body.parentMobile,
        address: body.address,
        admissionDate: body.admissionDate ? new Date(body.admissionDate) : undefined,
        notes: body.notes,
        amountPaid: Number(body.amountPaid ?? 0),
        remainingAmount: Number(body.remainingAmount ?? 0),
        status: body.status,
      },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Admission not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: updated });
  } catch (e) {
    console.error('Admissions PUT error', e);
    return NextResponse.json({ success: false, error: 'Failed to update admission' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await dbConnect();
  try {
    const deleted = await StudentAdmission.findByIdAndDelete(id).lean();
    
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Admission not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Admission deleted successfully' });
  } catch (e) {
    console.error('Admissions DELETE error', e);
    return NextResponse.json({ success: false, error: 'Failed to delete admission' }, { status: 500 });
  }
}
