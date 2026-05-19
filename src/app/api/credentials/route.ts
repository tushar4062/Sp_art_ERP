import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import Credential from '@/lib/models/Credentials';
import Teacher from '@/lib/models/Teacher';
import SeniorTeacher from '@/lib/models/SeniorTeacher';
import Student from '@/lib/models/Student';

export const runtime = 'nodejs';
const roles = ['student', 'teacher', 'senior_teacher'] as const;

const generateBadgeId = (role: 'teacher' | 'senior_teacher' | 'student') => {
  const prefix = role === 'teacher' ? 'TCH' : role === 'senior_teacher' ? 'SRT' : 'STU';
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
};

async function getUniqueBadgeId(role: 'teacher' | 'senior_teacher' | 'student') {
  let badgeId = generateBadgeId(role);
  if (role === 'teacher') {
    while (await Teacher.findOne({ badgeId })) {
      badgeId = generateBadgeId(role);
    }
  } else if (role === 'senior_teacher') {
    while (await SeniorTeacher.findOne({ badgeId })) {
      badgeId = generateBadgeId(role);
    }
  } else {
    while (await Student.findOne({ badgeId })) {
      badgeId = generateBadgeId(role);
    }
  }
  return badgeId;
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const url = new URL(request.url);
    const role = url.searchParams.get('role');

    const filter: Record<string, string> = {};
    if (role) {
      if (!roles.includes(role as typeof roles[number])) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      filter.role = role;
    }

    const credentials = await Credential.find(filter).sort({ createdAt: -1 });

    return NextResponse.json({
      credentials: credentials.map(doc => ({
        id: doc._id.toString(),
        name: doc.name,
        username: doc.username,
        email: doc.email,
        password: doc.password,
        mobileNumber: doc.mobileNumber,
        role: doc.role,
        accountStatus: doc.accountStatus,
        createdAt: doc.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const {
      name,
      email,
      password,
      confirmPassword,
      role = 'student',
      mobileNumber,
      accountStatus = 'Active',
      createdBy = 'Admin',
    } = body;

    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Name, email, password, and confirmPassword are required' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    if (!roles.includes(role as typeof roles[number])) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' },
        { status: 400 }
      );
    }

    const username = email.split('@')[0];

    const existingEmail = await Credential.findOne({ email });
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const existingUsername = await Credential.findOne({ username });
    if (existingUsername) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const credential = await Credential.create({
      name,
      username,
      email,
      password,
      passwordHash,
      role,
      accountStatus,
      mobileNumber,
      createdBy,
    });

    let extraRecord: Record<string, unknown> | null = null;
    let createdBadgeId: string | null = null;

    if (role === 'student') {
      try {
        const badgeId = await getUniqueBadgeId('student');
        createdBadgeId = badgeId;
        const student = await Student.create({
          fullName: name,
          email,
          badgeId,
          className: 'Not Assigned',
          phone: mobileNumber,
          feeStatus: 'Pending',
        });
        extraRecord = {
          student: {
            id: student._id.toString(),
            name: student.fullName,
            badgeId: student.badgeId,
            class: student.className,
            feeStatus: student.feeStatus,
          },
        };
      } catch (error) {
        console.error('Error creating student record:', error);
      }
    }

    if (role === 'teacher') {
      try {
        const badgeId = await getUniqueBadgeId('teacher');
        createdBadgeId = badgeId;
        const teacher = await Teacher.create({
          fullName: name,
          badgeId,
          email,
          phone: mobileNumber,
          specialization: 'Watercolor',
          experience: 1,
          status: accountStatus === 'Inactive' ? 'Inactive' : 'Active',
          classes: [],
          isSenior: false,
        });
        extraRecord = {
          teacher: {
            id: teacher._id.toString(),
            badgeId: teacher.badgeId,
            fullName: teacher.fullName,
            email: teacher.email,
            phone: teacher.phone,
            specialization: teacher.specialization,
            experience: teacher.experience,
            status: teacher.status,
            classes: teacher.classes,
            isSenior: teacher.isSenior,
          },
        };
      } catch (error) {
        console.error('Error creating teacher record:', error);
      }
    }

    if (role === 'senior_teacher') {
      try {
        const badgeId = await getUniqueBadgeId('senior_teacher');
        createdBadgeId = badgeId;
        const seniorTeacher = await SeniorTeacher.create({
          fullName: name,
          badgeId,
          email,
          phone: mobileNumber,
          specialization: 'General Art',
          yearsOfExperience: 1,
          role: 'Senior Teacher',
          qualification: 'Art Education',
          address: 'Not provided',
          joiningDate: new Date(),
          salary: 0,
          bio: 'Created from credential',
          profileImage: '',
          status: accountStatus === 'Inactive' ? 'Inactive' : 'Active',
          assignedClasses: 0,
        });
        extraRecord = {
          seniorTeacher: {
            id: seniorTeacher._id.toString(),
            badgeId: seniorTeacher.badgeId,
            fullName: seniorTeacher.fullName,
            email: seniorTeacher.email,
            phone: seniorTeacher.phone,
            specialization: seniorTeacher.specialization,
            yearsOfExperience: seniorTeacher.yearsOfExperience,
            role: seniorTeacher.role,
            qualification: seniorTeacher.qualification,
            address: seniorTeacher.address,
            joiningDate: seniorTeacher.joiningDate,
            salary: seniorTeacher.salary,
            bio: seniorTeacher.bio,
            status: seniorTeacher.status,
            assignedClasses: seniorTeacher.assignedClasses,
          },
        };
      } catch (error) {
        console.error('Error creating senior teacher record:', error);
      }
    }

    return NextResponse.json(
      {
        message: 'Credential created successfully',
        credentials: {
          id: credential._id.toString(),
          name: credential.name,
          username: credential.username,
          email: credential.email,
          password: credential.password,
          mobileNumber: credential.mobileNumber,
          role: credential.role,
          accountStatus: credential.accountStatus,
          badgeId: createdBadgeId,
          createdAt: credential.createdAt,
        },
        ...extraRecord,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating credential:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
