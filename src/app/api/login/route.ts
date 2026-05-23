import { NextRequest, NextResponse } from 'next/server';
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
import { findCredentialByLogin } from '@/lib/auth/findCredential';
import { findStaffProfileByLogin } from '@/lib/auth/findStaffProfileByLogin';
import { normalizeEmail } from '@/lib/auth/normalizeEmail';
import { provisionStaffLoginCredential } from '@/lib/auth/provisionStaffLoginCredential';
import { verifyCredentialPassword } from '@/lib/auth/verifyCredentialPassword';
import bcrypt from 'bcryptjs';
import { resolveLoginRole } from '@/lib/auth/resolveLoginRole';

function clearOtherPortalSessions(res: NextResponse) {
  res.cookies.set(TEACHER_SESSION_COOKIE, '', clearSessionCookieOptions());
  res.cookies.set(SENIOR_TEACHER_SESSION_COOKIE, '', clearSessionCookieOptions());
  res.cookies.set(STUDENT_SESSION_COOKIE, '', clearSessionCookieOptions());
}

function emailRegex(emailNorm: string) {
  const esc = emailNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return { $regex: new RegExp(`^${esc}$`, 'i') };
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

    if (expectedRole === 'student') {
      return NextResponse.json({ error: 'Use the Student login flow for student accounts' }, { status: 400 });
    }

    const loginId = String(email).trim();
    let credential = await findCredentialByLogin(loginId);

    if (
      !credential &&
      (expectedRole === 'senior_teacher' || expectedRole === 'teacher')
    ) {
      credential = await provisionStaffLoginCredential(
        expectedRole,
        loginId,
        String(password),
      );
    }

    if (!credential) {
      const profile =
        expectedRole === 'senior_teacher' || expectedRole === 'teacher'
          ? await findStaffProfileByLogin(loginId, expectedRole)
          : null;

      let profileHint = '';
      if (profile) {
        profileHint =
          expectedRole === 'senior_teacher'
            ? ' Your senior teacher profile exists. Sign in with the same email and a password that meets the rules (8+ characters, upper, lower, number, and special character like @). That will activate your login on first sign-in. Or ask admin to add a credential under Admin → Credentials → Senior Teachers.'
            : ' Your teacher profile exists. Use a password that meets the rules (8+ characters, upper, lower, number, special) to activate login on first sign-in, or ask admin to add a credential under Admin → Credentials.';
      }

      return NextResponse.json(
        {
          error: `No login account found for this email or ID.${profileHint || ' Ask admin to create your credential under Admin → Credentials.'}`,
        },
        { status: 401 },
      );
    }

    if (credential.accountStatus !== 'Active') {
      return NextResponse.json({ error: 'Account is inactive. Contact admin to activate your credential.' }, { status: 403 });
    }

    let passwordOk = await verifyCredentialPassword(credential, String(password));

    if (!passwordOk) {
      const hash = credential.passwordHash?.trim() ?? '';
      const legacy = credential.password?.trim() ?? '';
      const plain = String(password).trim();
      if (plain.length >= 8 && (!hash || hash.length < 20) && !legacy) {
        credential.passwordHash = await bcrypt.hash(plain, 12);
        credential.password = plain;
        await credential.save();
        passwordOk = await verifyCredentialPassword(credential, plain);
      }
    }

    if (!passwordOk) {
      const profile =
        expectedRole === 'senior_teacher' || expectedRole === 'teacher'
          ? await findStaffProfileByLogin(loginId, expectedRole)
          : null;
      const resetHint = profile
        ? ' If this is your first login, use a strong password (8+ chars with upper, lower, number, and @) matching what admin shared, or ask admin to reset under Admin → Credentials.'
        : ' Ask admin to reset your password under Admin → Credentials.';

      return NextResponse.json(
        {
          error: `Incorrect password.${resetHint}`,
        },
        { status: 401 },
      );
    }

    const roleCheck = await resolveLoginRole(
      credential,
      expectedRole as 'teacher' | 'senior_teacher',
    );
    if (roleCheck.ok === false) return roleCheck.response;

    const cred = roleCheck.credential;
    const credEmail = normalizeEmail(cred.email);

    if (expectedRole === 'teacher') {
      const teacher = await Teacher.findOne({ email: emailRegex(credEmail) });
      if (!teacher) {
        return NextResponse.json(
          {
            error:
              'No teacher profile found for this email. Ask admin to add you under Teachers with the same email as your credential.',
          },
          { status: 404 },
        );
      }

      const res = NextResponse.json({
        user: {
          email: cred.email,
          name: cred.name,
          role,
        },
      });
      clearOtherPortalSessions(res);
      res.cookies.set(TEACHER_SESSION_COOKIE, teacher._id.toString(), portalSessionCookieOptions());
      return res;
    }

    if (expectedRole === 'senior_teacher') {
      let senior = await SeniorTeacher.findOne({ email: emailRegex(credEmail) });
      if (!senior) {
        try {
          const badgeId = `SRT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
          senior = await SeniorTeacher.create({
            fullName: cred.name,
            badgeId,
            email: credEmail,
            phone: cred.mobileNumber ?? 'Not provided',
            specialization: 'General Art',
            yearsOfExperience: 1,
            role: 'Senior Teacher',
            qualification: 'Art Education',
            address: 'Not provided',
            joiningDate: new Date(),
            salary: 0,
            bio: 'Auto-created on first login',
            profileImage: '',
            status: 'Active',
            assignedClasses: 0,
          });
        } catch (e) {
          console.error('[login] auto-create senior teacher failed', e);
          return NextResponse.json(
            {
              error:
                'No senior teacher profile found for this email. Ask admin to add you under Senior Teachers with the same email as your credential.',
            },
            { status: 404 },
          );
        }
      }

      const res = NextResponse.json({
        user: {
          email: cred.email,
          name: cred.name,
          role,
        },
      });
      clearOtherPortalSessions(res);
      res.cookies.set(SENIOR_TEACHER_SESSION_COOKIE, senior._id.toString(), portalSessionCookieOptions());
      return res;
    }

    return NextResponse.json({ error: 'Unsupported role' }, { status: 400 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
