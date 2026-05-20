import dbConnect from '@/lib/mongodb';
import StudentAdmission from '@/lib/models/StudentAdmission';
import { NextResponse } from 'next/server';

export async function GET() {
  await dbConnect();
  try {
    const items = await StudentAdmission.find().sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json({ success: true, items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: 'Failed to load admissions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await dbConnect();
  try {
    const body = await req.json();
    const admission = new StudentAdmission({
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
      status: 'Pending',
      createdBy: body.createdBy,
    });
    const saved = await admission.save();
    return NextResponse.json({ success: true, item: saved });
  } catch (e) {
    console.error('Admissions POST error', e);
    return NextResponse.json({ success: false, error: 'Failed to save admission' }, { status: 500 });
  }
}
