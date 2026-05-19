import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import StudentCredentials from '@/lib/models/StudentCredentials';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: unknown
) {
  const { params } = context as { params: { id: string } };
  try {
    await dbConnect();

    const credentials = await StudentCredentials.findOne({ _id: params.id });
    if (!credentials) {
      return NextResponse.json(
        { error: 'Credentials not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      credentials: {
        id: credentials._id,
        student: credentials.studentId,
        username: credentials.username,
        email: credentials.email,
        role: credentials.role,
        accountStatus: credentials.accountStatus,
        portalAccess: credentials.portalAccess,
        forcePasswordReset: credentials.forcePasswordReset,
        recoveryEmail: credentials.recoveryEmail,
        mobileNumber: credentials.mobileNumber,
        studentIdNumber: credentials.studentIdNumber,
        createdAt: credentials.createdAt,
        updatedAt: credentials.updatedAt,
      },
    });

  } catch (error) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: unknown
) {
  const { params } = context as { params: { id: string } };
  try {
    await dbConnect();

    const body = await request.json();
    const {
      username,
      email,
      password,
      confirmPassword,
      role,
      accountStatus,
      portalAccess,
      forcePasswordReset,
      recoveryEmail,
      mobileNumber,
      studentIdNumber,
    } = body;

    // Validation
    if (username) {
      const existingUsername = await StudentCredentials.findOne({ username, _id: { $ne: params.id } });
      if (existingUsername) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 409 }
        );
      }
    }

    if (email) {
      const existingEmail = await StudentCredentials.findOne({ email, _id: { $ne: params.id } });
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        );
      }
    }

    if (password) {
      if (password !== confirmPassword) {
        return NextResponse.json(
          { error: 'Passwords do not match' },
          { status: 400 }
        );
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' },
          { status: 400 }
        );
      }
    }

    const updateData: Partial<typeof body> = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) {
      const saltRounds = 12;
      updateData.passwordHash = await bcrypt.hash(password, saltRounds);
    }
    if (role) updateData.role = role;
    if (accountStatus) updateData.accountStatus = accountStatus;
    if (portalAccess !== undefined) updateData.portalAccess = portalAccess;
    if (forcePasswordReset !== undefined) updateData.forcePasswordReset = forcePasswordReset;
    if (recoveryEmail !== undefined) updateData.recoveryEmail = recoveryEmail;
    if (mobileNumber !== undefined) updateData.mobileNumber = mobileNumber;
    if (studentIdNumber !== undefined) updateData.studentIdNumber = studentIdNumber;

    const credentials = await StudentCredentials.findOneAndUpdate(
      { _id: params.id },
      updateData,
      { new: true }
    );

    if (!credentials) {
      return NextResponse.json(
        { error: 'Credentials not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Credentials updated successfully',
      credentials: {
        id: credentials._id,
        student: credentials.studentId,
        username: credentials.username,
        email: credentials.email,
        role: credentials.role,
        accountStatus: credentials.accountStatus,
        portalAccess: credentials.portalAccess,
        forcePasswordReset: credentials.forcePasswordReset,
        recoveryEmail: credentials.recoveryEmail,
        mobileNumber: credentials.mobileNumber,
        studentIdNumber: credentials.studentIdNumber,
        updatedAt: credentials.updatedAt,
      },
    });

  } catch (error) {
    console.error('Error updating credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: unknown
) {
  const { params } = context as { params: { id: string } };
  try {
    await dbConnect();

    const credentials = await StudentCredentials.findOneAndDelete({ _id: params.id });
    if (!credentials) {
      return NextResponse.json(
        { error: 'Credentials not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Credentials deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}