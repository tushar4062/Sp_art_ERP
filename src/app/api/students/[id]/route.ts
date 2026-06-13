import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import StudentCredentials from '@/lib/models/StudentCredentials';
import Credentials from '@/lib/models/Credentials';

export const runtime = 'nodejs';

export async function PUT(request: Request, context: unknown) {
  const { params } = context as { params: { id: string } };

  try {
    await dbConnect();

    const body = await request.json();
    const {
      fullName,
      email,
      badgeId,
      phone,
      photo,
      dob,
      age,
      bloodGroup,
      gender,
      school,
      college,
      occupation,
      fatherName,
      fatherMobile,
      fatherOccupation,
      motherName,
      motherMobile,
      motherOccupation,
      address,
      howYouKnowUs,
      feeStatus = 'Pending',
    } = body;

    if (!fullName || !badgeId) {
      return NextResponse.json(
        { error: 'Full name and badge ID are required' },
        { status: 400 }
      );
    }

    const student = await Student.findById(params.id);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (badgeId !== student.badgeId) {
      const existing = await Student.findOne({ badgeId });
      if (existing) {
        return NextResponse.json({ error: 'Badge ID already exists' }, { status: 409 });
      }
    }

    // Store the old name to check if it changed
    const oldName = student.fullName;
    const nameChanged = oldName !== fullName;

    const updatedStudent = await Student.findByIdAndUpdate(
      params.id,
      {
        fullName,
        email,
        badgeId,
        phone,
        photo,
        dob,
        age,
        bloodGroup,
        gender,
        school,
        college,
        occupation,
        fatherName,
        fatherMobile,
        fatherOccupation,
        motherName,
        motherMobile,
        motherOccupation,
        address,
        howYouKnowUs,
        howYouComeToKnow: howYouKnowUs ?? student.howYouComeToKnow,
        feeStatus,
      },
      { new: true, runValidators: true }
    );

    if (!updatedStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Synchronize name change to Credentials collections
    if (nameChanged && email) {
      try {
        // Update StudentCredentials by email reference
        await StudentCredentials.findOneAndUpdate(
          { email: email.toLowerCase() },
          { name: fullName },
          { new: true }
        );

        // Update Credentials (generic credentials) by email and role='student'
        await Credentials.findOneAndUpdate(
          { email: email.toLowerCase(), role: 'student' },
          { name: fullName },
          { new: true }
        );
      } catch (syncError) {
        // Log sync error but don't fail the main student update
        console.error('Warning: Failed to sync name to credentials:', syncError);
      }
    }

    return NextResponse.json({
      message: 'Student updated successfully',
      student: {
        id: updatedStudent._id.toString(),
        name: updatedStudent.fullName,
        email: updatedStudent.email,
        badgeId: updatedStudent.badgeId,
        class: updatedStudent.className,
        feeStatus: updatedStudent.feeStatus,
        phone: updatedStudent.phone,
        photo: updatedStudent.photo,
        parentName: updatedStudent.parentName,
        dob: updatedStudent.dob,
        age: updatedStudent.age,
        bloodGroup: updatedStudent.bloodGroup,
        gender: updatedStudent.gender,
        school: updatedStudent.school,
        college: updatedStudent.college,
        occupation: updatedStudent.occupation,
        fatherName: updatedStudent.fatherName,
        fatherMobile: updatedStudent.fatherMobile,
        fatherOccupation: updatedStudent.fatherOccupation,
        motherName: updatedStudent.motherName,
        motherMobile: updatedStudent.motherMobile,
        motherOccupation: updatedStudent.motherOccupation,
        address: updatedStudent.address,
        howYouComeToKnow: updatedStudent.howYouComeToKnow,
        howYouKnowUs: updatedStudent.howYouKnowUs,
        createdAt: updatedStudent.createdAt,
      },
    });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
