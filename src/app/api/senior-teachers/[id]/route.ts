import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SeniorTeacher from '@/lib/models/SeniorTeacher';
import Credentials from '@/lib/models/Credentials';
import { ensureSeniorTeacherCredential } from '@/lib/auth/ensureSeniorTeacherCredential';
import { normalizeEmail } from '@/lib/auth/normalizeEmail';

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

    // Get current teacher to check if name changed
    const currentTeacher = await SeniorTeacher.findById(id);
    if (!currentTeacher) {
      return NextResponse.json({ error: 'Senior teacher not found' }, { status: 404 });
    }
    const oldName = currentTeacher.fullName;
    const nameChanged = oldName !== (body.fullName as string);

    const teacher = await SeniorTeacher.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
    if (!teacher) {
      return NextResponse.json({ error: 'Senior teacher not found' }, { status: 404 });
    }

    // Synchronize name change to Credentials collection
    if (nameChanged && body.email) {
      try {
        await Credentials.findOneAndUpdate(
          { email: (body.email as string).toLowerCase(), role: 'senior_teacher' },
          { name: body.fullName },
          { new: true }
        );
      } catch (syncError) {
        console.error('Warning: Failed to sync senior teacher name to credentials:', syncError);
      }
    }

    let credentialInfo: Record<string, unknown> | null = null;
    try {
      const cred = await ensureSeniorTeacherCredential({
        name: teacher.fullName,
        email: normalizeEmail(teacher.email),
        mobileNumber: teacher.phone,
        accountStatus: teacher.status === 'Inactive' ? 'Inactive' : 'Active',
        createdBy: 'Senior Teachers admin (update)',
      });
      credentialInfo = {
        credentialCreated: cred.created,
        credentialEmailSent: cred.created ? cred.emailSent : undefined,
        ...(cred.created && !cred.emailSent
          ? { temporaryPassword: cred.password, credentialEmailError: cred.emailError }
          : {}),
      };
    } catch (credError) {
      console.error('Error ensuring senior teacher credential on update:', credError);
    }

    return NextResponse.json({
      message: 'Senior teacher updated successfully',
      ...credentialInfo,
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
