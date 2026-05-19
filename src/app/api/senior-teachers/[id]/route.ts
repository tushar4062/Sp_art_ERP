import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SeniorTeacher from '@/lib/models/SeniorTeacher';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await dbConnect();
    const teacher = await SeniorTeacher.findById(id);
    if (!teacher) {
      return NextResponse.json({ error: 'Senior teacher not found' }, { status: 404 });
    }
    return NextResponse.json({
      teacher: {
        id: teacher._id.toString(),
        badgeId: teacher.badgeId,
        fullName: teacher.fullName,
        email: teacher.email,
        phone: teacher.phone,
        dob: teacher.dob,
        age: teacher.age,
        gender: teacher.gender,
        bloodGroup: teacher.bloodGroup,
        specialization: teacher.specialization,
        yearsOfExperience: teacher.yearsOfExperience,
        role: teacher.role,
        qualification: teacher.qualification,
        address: teacher.address,
        joiningDate: teacher.joiningDate,
        salary: teacher.salary,
        bio: teacher.bio,
        profileImage: teacher.profileImage,
        status: teacher.status,
        assignedClasses: teacher.assignedClasses,
        createdAt: teacher.createdAt,
        updatedAt: teacher.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching senior teacher:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await dbConnect();
    const body = (await request.json()) as Record<string, unknown>;
    const updateData: Record<string, unknown> = {};

    if (typeof body.fullName === 'string') updateData.fullName = body.fullName;
    if (typeof body.email === 'string') updateData.email = body.email;
    if (typeof body.phone === 'string') updateData.phone = body.phone;
    if (typeof body.dob === 'string') updateData.dob = new Date(body.dob);
    if (typeof body.age === 'number') updateData.age = body.age;
    if (typeof body.gender === 'string') updateData.gender = body.gender;
    if (typeof body.bloodGroup === 'string') updateData.bloodGroup = body.bloodGroup;
    if (typeof body.specialization === 'string') updateData.specialization = body.specialization;
    if (typeof body.yearsOfExperience === 'number') updateData.yearsOfExperience = body.yearsOfExperience;
    if (typeof body.role === 'string') updateData.role = body.role;
    if (typeof body.qualification === 'string') updateData.qualification = body.qualification;
    if (typeof body.address === 'string') updateData.address = body.address;
    if (typeof body.joiningDate === 'string') updateData.joiningDate = new Date(body.joiningDate);
    if (typeof body.salary === 'number') updateData.salary = body.salary;
    if (typeof body.bio === 'string') updateData.bio = body.bio;
    if (typeof body.profileImage === 'string') updateData.profileImage = body.profileImage;
    if (typeof body.status === 'string') updateData.status = body.status;
    if (typeof body.assignedClasses === 'number') updateData.assignedClasses = body.assignedClasses;
    if (typeof body.badgeId === 'string' && body.badgeId.trim()) updateData.badgeId = body.badgeId.trim();

    if (body.email) {
      const existingEmail = await SeniorTeacher.findOne({ email: body.email, _id: { $ne: id } });
      if (existingEmail) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }
    }

    const teacher = await SeniorTeacher.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
    if (!teacher) {
      return NextResponse.json({ error: 'Senior teacher not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Senior teacher updated successfully',
      teacher: {
        id: teacher._id.toString(),
        badgeId: teacher.badgeId,
        fullName: teacher.fullName,
        email: teacher.email,
        phone: teacher.phone,
        dob: teacher.dob,
        age: teacher.age,
        gender: teacher.gender,
        bloodGroup: teacher.bloodGroup,
        specialization: teacher.specialization,
        yearsOfExperience: teacher.yearsOfExperience,
        role: teacher.role,
        qualification: teacher.qualification,
        address: teacher.address,
        joiningDate: teacher.joiningDate,
        salary: teacher.salary,
        bio: teacher.bio,
        profileImage: teacher.profileImage,
        status: teacher.status,
        assignedClasses: teacher.assignedClasses,
        createdAt: teacher.createdAt,
        updatedAt: teacher.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating senior teacher:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await dbConnect();
    const teacher = await SeniorTeacher.findByIdAndDelete(id);
    if (!teacher) {
      return NextResponse.json({ error: 'Senior teacher not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Senior teacher deleted successfully' });
  } catch (error) {
    console.error('Error deleting senior teacher:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
