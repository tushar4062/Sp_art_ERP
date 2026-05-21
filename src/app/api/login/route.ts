import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import Teacher from '@/lib/models/Teacher';
import SeniorTeacher from '@/lib/models/SeniorTeacher';
import {
  TEACHER_SESSION_COOKIE,
  SENIOR_TEACHER_SESSION_COOKIE,
  STUDENT_SESSION_COOKIE,
  portalSessionCookieOptions,
  clearSessionCookieOptions,
} from '@/lib/auth/portal-session';
import { findCredentialByEmail } from '@/lib/auth/findCredential';
import { normalizeEmail } from '@/lib/auth/normalizeEmail';

function clearOtherPortalSessions(res: NextResponse) {
  res.cookies.set(TEACHER_SESSION_COOKIE, '', clearSessionCookieOptions());
  res.cookies.set(SENIOR_TEACHER_SESSION_COOKIE, '', clearSessionCookieOptions());
  res.cookies.set(STUDENT_SESSION_COOKIE, '', clearSessionCookieOptions());
}

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

    const emailNorm = normalizeEmail(String(email));
    const credential = await findCredentialByEmail(emailNorm);
    if (!credential) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!credential.passwordHash) {
      return NextResponse.json(
        { error: 'Account password is not set. Ask admin to reset your credential password.' },
        { status: 401 },
      );
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
      const credEmail = normalizeEmail(credential.email);
      const esc = credEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      clearOtherPortalSessions(res);
      res.cookies.set(TEACHER_SESSION_COOKIE, teacher._id.toString(), portalSessionCookieOptions());
      return res;
    }

    if (expectedRole === 'senior_teacher') {
      const credEmail = normalizeEmail(credential.email);
      const esc = credEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      clearOtherPortalSessions(res);
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