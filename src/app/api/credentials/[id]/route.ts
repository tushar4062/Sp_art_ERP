import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import Credential from '@/lib/models/Credentials';
import Student from '@/lib/models/Student';
import Teacher from '@/lib/models/Teacher';
import SeniorTeacher from '@/lib/models/SeniorTeacher';

export const runtime = 'nodejs';
const roles = ['student', 'teacher', 'senior_teacher'] as const;
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
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

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  try {
    await dbConnect();
    const body = await request.json();
    const {
      name,
      email,
      password,
      confirmPassword,
      role,
      accountStatus,
      mobileNumber,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (name) updateData.name = name;
    if (email) {
      const existingEmail = await Credential.findOne({ email, _id: { $ne: id } });
      if (existingEmail) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
      updateData.email = email;
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

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
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
