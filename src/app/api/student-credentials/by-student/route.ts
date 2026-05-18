import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StudentCredentials from '@/lib/models/StudentCredentials';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    const credentials = await StudentCredentials.findOne({ studentId });

    if (!credentials) {
      return NextResponse.json({
        hasCredentials: false,
        credentials: null,
      });
    }

    return NextResponse.json({
      hasCredentials: true,
      credentials: {
        id: credentials._id,
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
    console.error('Error fetching credentials by student:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}