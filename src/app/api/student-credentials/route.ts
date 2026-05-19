import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import StudentCredentials from '@/lib/models/StudentCredentials';
import Student from '@/lib/models/Student';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await dbConnect();
    const credentials = await StudentCredentials.find().sort({ createdAt: -1 });
    return NextResponse.json({
      credentials: credentials.map((doc) => ({
        id: doc._id.toString(),
        studentId: doc.studentId,
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
      studentId,
      name,
      username,
      email,
      password,
      confirmPassword,
      role = 'Student',
      portalAccess = true,
      forcePasswordReset = true,
      recoveryEmail,
      mobileNumber,
      studentIdNumber,
      createdBy = 'Admin',
    } = body;

    const computedStudentId = studentId || `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

    // Validation
    if (!name || !username || !email || !password) {
      return NextResponse.json(
        { error: 'Name, username, email, and password are required' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' },
        { status: 400 }
      );
    }

    // Check if credentials already exist for this student id
    const existingCredentials = await StudentCredentials.findOne({ studentId: computedStudentId });
    if (existingCredentials) {
      return NextResponse.json(
        { error: 'Credentials already exist for this student ID' },
        { status: 409 }
      );
    }

    // Check username and email uniqueness
    const existingUsername = await StudentCredentials.findOne({ username });
    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      );
    }

    const existingEmail = await StudentCredentials.findOne({ email });
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create credentials
    const credentials = await StudentCredentials.create({
      studentId: computedStudentId,
      name,
      username,
      email,
      password,
      passwordHash,
      role,
      accountStatus: 'Active',
      portalAccess,
      forcePasswordReset,
      recoveryEmail,
      mobileNumber,
      studentIdNumber,
      createdBy,
    });

    // Auto-create a Student record when student credentials are created.
    const badgeId = studentIdNumber?.trim() || computedStudentId;
    const existingStudent = await Student.findOne({ $or: [{ badgeId }, { email }] });

    if (!existingStudent) {
      try {
        await Student.create({
          fullName: name,
          email,
          badgeId,
          className: 'Not Assigned',
          phone: mobileNumber,
          feeStatus: 'Pending',
        });
      } catch (error) {
        console.error('Error creating student record for credentials:', error);
      }
    }

    return NextResponse.json({
      message: 'Credentials created successfully',
      credentials: {
        id: credentials._id,
        studentId: credentials.studentId,
        name: credentials.name,
        username: credentials.username,
        email: credentials.email,
        password: credentials.password,
        mobileNumber: credentials.mobileNumber,
        role: credentials.role,
        accountStatus: credentials.accountStatus,
        portalAccess: credentials.portalAccess,
        createdAt: credentials.createdAt,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating student credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}