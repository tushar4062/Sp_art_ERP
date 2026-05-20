import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import Credential from '@/lib/models/Credentials';
import Teacher from '@/lib/models/Teacher';
import SeniorTeacher from '@/lib/models/SeniorTeacher';
import {
  TEACHER_SESSION_COOKIE,
  SENIOR_TEACHER_SESSION_COOKIE,
  portalSessionCookieOptions,
} from '@/lib/auth/portal-session';

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

    if (expectedRole === 'teacher') {
      const emailNorm = credential.email.toLowerCase().trim();
      const esc = emailNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const teacher = await Teacher.findOne({
        email: { $regex: new RegExp(`^${esc}$`, 'i') },
      });
      if (!teacher) {
        return NextResponse.json(
          {
            error:
              'No teacher record found for this email. Ask admin to add you under Teachers with the same email as your login.',
          },
          { status: 404 },
        );
      }

      const res = NextResponse.json({
        user: {
          email: credential.email,
          name: credential.name,
          role,
        },
      });
      res.cookies.set(TEACHER_SESSION_COOKIE, teacher._id.toString(), portalSessionCookieOptions());
      return res;
    }

    if (expectedRole === 'senior_teacher') {
      const emailNorm = credential.email.toLowerCase().trim();
      const esc = emailNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const senior = await SeniorTeacher.findOne({
        email: { $regex: new RegExp(`^${esc}$`, 'i') },
      });
      if (!senior) {
        return NextResponse.json(
          {
            error:
              'No senior teacher record found for this email. Ask admin to add you under Senior Teachers with the same email as your login.',
          },
          { status: 404 },
        );
      }

      const res = NextResponse.json({
        user: {
          email: credential.email,
          name: credential.name,
          role,
        },
      });
      res.cookies.set(SENIOR_TEACHER_SESSION_COOKIE, senior._id.toString(), portalSessionCookieOptions());
      return res;
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