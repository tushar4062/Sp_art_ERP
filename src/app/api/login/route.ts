import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import Credential from '@/lib/models/Credentials';

export const runtime = 'nodejs';

const ROLE_MAP: Record<string, 'student' | 'teacher' | 'senior_teacher' | null> = {
  student: 'student',
  teacher: 'teacher',
  'senior-teacher': 'senior_teacher',
};

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { email, password, role } = body;

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Email, password, and role are required' }, { status: 400 });
    }

    const expectedRole = ROLE_MAP[role];
    if (!expectedRole) {
      return NextResponse.json({ error: 'This role is not supported for database login yet' }, { status: 400 });
    }

    const credential = await Credential.findOne({ email: email.toLowerCase() });
    if (!credential) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (credential.role !== expectedRole) {
      return NextResponse.json({ error: 'Role does not match the selected login type' }, { status: 403 });
    }

    if (credential.accountStatus !== 'Active') {
      return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
    }

    const isPasswordValid = await bcrypt.compare(password, credential.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        email: credential.email,
        name: credential.name,
        role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
