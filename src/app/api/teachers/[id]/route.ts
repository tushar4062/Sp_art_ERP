import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Teacher from '@/lib/models/Teacher';
import Credentials from '@/lib/models/Credentials';
import { Types } from 'mongoose';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const teacher = await Teacher.findById(id);

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    return NextResponse.json({
      teacher: {
        id: teacher._id.toString(),
        badgeId: teacher.badgeId,
        photo: teacher.photo,
        fullName: teacher.fullName,
        email: teacher.email,
        phone: teacher.phone,
        dob: teacher.dob,
        age: teacher.age,
        gender: teacher.gender,
        bloodGroup: teacher.bloodGroup,
        schoolCollege: teacher.schoolCollege,
        parentGuardianDetails: teacher.parentGuardianDetails,
        address: teacher.address,
        className: teacher.className,
        currentSubjectCourse: teacher.currentSubjectCourse,
        experience: teacher.experience,
        batchDetails: teacher.batchDetails,
        specialization: teacher.specialization,
        role: teacher.role,
        status: teacher.status,
        classes: teacher.classes,
        isSenior: teacher.isSenior,
        createdAt: teacher.createdAt,
        updatedAt: teacher.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching teacher:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid teacher ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      dob,
      age,
      gender,
      bloodGroup,
      schoolCollege,
      parentGuardianDetails,
      address,
      photo,
      className,
      currentSubjectCourse,
      experience,
      batchDetails,
      specialization,
      role,
      status,
      classes,
    } = body;

    // Get current teacher to check if name changed
    const currentTeacher = await Teacher.findById(id);
    if (!currentTeacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }
    const oldName = currentTeacher.fullName;
    const nameChanged = oldName !== fullName;

    const teacher = await Teacher.findByIdAndUpdate(
      id,
      {
        fullName,
        email,
        phone,
        dob,
        age,
        gender,
        bloodGroup,
        schoolCollege,
        parentGuardianDetails,
        address,
        photo,
        className,
        currentSubjectCourse,
        experience,
        batchDetails,
        specialization,
        role,
        status,
        classes,
      },
      { new: true }
    );

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Synchronize name change to Credentials collection
    if (nameChanged && email) {
      try {
        await Credentials.findOneAndUpdate(
          { email: email.toLowerCase(), role: 'teacher' },
          { name: fullName },
          { new: true }
        );
      } catch (syncError) {
        console.error('Warning: Failed to sync teacher name to credentials:', syncError);
      }
    }

    return NextResponse.json({
      message: 'Teacher updated successfully',
      teacher: {
        id: teacher._id.toString(),
        badgeId: teacher.badgeId,
        photo: teacher.photo,
        fullName: teacher.fullName,
        email: teacher.email,
        phone: teacher.phone,
        dob: teacher.dob,
        age: teacher.age,
        gender: teacher.gender,
        bloodGroup: teacher.bloodGroup,
        schoolCollege: teacher.schoolCollege,
        parentGuardianDetails: teacher.parentGuardianDetails,
        address: teacher.address,
        className: teacher.className,
        currentSubjectCourse: teacher.currentSubjectCourse,
        experience: teacher.experience,
        batchDetails: teacher.batchDetails,
        specialization: teacher.specialization,
        role: teacher.role,
        status: teacher.status,
        classes: teacher.classes,
        isSenior: teacher.isSenior,
        createdAt: teacher.createdAt,
        updatedAt: teacher.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating teacher:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid teacher ID' }, { status: 400 });
    }

    const teacher = await Teacher.findByIdAndDelete(id);

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
