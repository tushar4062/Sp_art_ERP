import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import Credential from '@/lib/models/Credentials';
import Student from '@/lib/models/Student';
import StudentCredentials from '@/lib/models/StudentCredentials';
import Teacher from '@/lib/models/Teacher';
import SeniorTeacher from '@/lib/models/SeniorTeacher';
import { normalizeEmail } from '@/lib/auth/normalizeEmail';
import { findCredentialByEmail } from '@/lib/auth/findCredential';
import { requireAdminFromRequest } from '@/lib/auth/require-admin';

export const runtime = 'nodejs';
const roles = ['student', 'teacher', 'senior_teacher'] as const;
type RouteContext = { params: Promise<{ id: string }> };
type UpdateCredentialPayload = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
  accountStatus?: string;
  mobileNumber?: string;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const adminCheck = await requireAdminFromRequest(request);
  if (!adminCheck.ok) return adminCheck.response;

  const { id } = await context.params;
  try {
    await dbConnect();
    const credential = await Credential.findById(id);
    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    return NextResponse.json({
      credentials: {
        id: credential._id.toString(),
        name: credential.name,
        username: credential.username,
        email: credential.email,
        mobileNumber: credential.mobileNumber,
        role: credential.role,
        accountStatus: credential.accountStatus,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching credential:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function updateCredentialById(id: string, body: UpdateCredentialPayload) {
  try {
    await dbConnect();
    const {
      name,
      email,
      password,
      confirmPassword,
      role,
      accountStatus,
      mobileNumber,
    } = body;

    const existingCredential = await Credential.findById(id);
    if (!existingCredential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (name) updateData.name = name;
    if (email) {
      const emailNorm = normalizeEmail(email);
      const existingEmail = await findCredentialByEmail(emailNorm);
      if (existingEmail && existingEmail._id.toString() !== id) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
      updateData.email = emailNorm;
    }

    if (role) {
      if (!roles.includes(role as typeof roles[number])) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      updateData.role = role;
    }

    if (accountStatus) {
      updateData.accountStatus = accountStatus;
    }

    if (mobileNumber !== undefined) {
      updateData.mobileNumber = mobileNumber;
    }

    if (password) {
      if (password !== confirmPassword) {
        return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' },
          { status: 400 }
        );
      }

      updateData.password = password;
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    const credential = await Credential.findByIdAndUpdate(id, updateData, { new: true });
    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    const targetRole = (updateData.role as typeof roles[number]) ?? existingCredential.role;
    const originalEmail = existingCredential.email;
    const changesForSync: Record<string, unknown> = {};
    if (updateData.name && updateData.name !== existingCredential.name) {
      changesForSync.name = updateData.name;
    }
    if (updateData.email && updateData.email !== existingCredential.email) {
      changesForSync.email = updateData.email;
    }
    if (updateData.passwordHash) {
      changesForSync.passwordHash = updateData.passwordHash;
    }

    if (Object.keys(changesForSync).length > 0) {
      try {
        await StudentCredentials.findOneAndUpdate(
          { email: originalEmail.toLowerCase() },
          changesForSync,
          { new: true }
        );
      } catch (syncError) {
        console.error('Warning: Failed to sync updates to StudentCredentials:', syncError);
      }
    }

    if (targetRole === 'student') {
      try {
        const student = await Student.findOne({
          email: { $regex: new RegExp(`^${originalEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, 'i') },
        });
        if (student) {
          if (updateData.email) student.email = updateData.email as string;
          if (updateData.passwordHash) student.passwordHash = updateData.passwordHash as string;
          if (updateData.name) student.fullName = updateData.name as string;
          await student.save();
        }
      } catch (syncError) {
        console.error('Warning: Failed to sync updates to Student record:', syncError);
      }
    }

    return NextResponse.json({
      message: 'Credential updated successfully',
      credentials: {
        id: credential._id.toString(),
        name: credential.name,
        username: credential.username,
        email: credential.email,
        mobileNumber: credential.mobileNumber,
        role: credential.role,
        accountStatus: credential.accountStatus,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating credential:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const adminCheck = await requireAdminFromRequest(request);
  if (!adminCheck.ok) return adminCheck.response;

  const { id } = await context.params;
  const body = await request.json();
  return updateCredentialById(id, body);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const adminCheck = await requireAdminFromRequest(request);
  if (!adminCheck.ok) return adminCheck.response;

  const { id } = await context.params;
  try {
    await dbConnect();
    const credential = await Credential.findByIdAndDelete(id);
    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    const email = credential.email;
    const role = credential.role;

    if (role === 'student') {
      await Student.deleteMany({ email });
    } else if (role === 'teacher') {
      await Teacher.deleteMany({ email });
    } else if (role === 'senior_teacher') {
      await SeniorTeacher.deleteMany({ email });
    }

    return NextResponse.json({ message: 'Credential deleted successfully' });
  } catch (error) {
    console.error('Error deleting credential:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
