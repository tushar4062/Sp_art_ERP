import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Student from '@/lib/models/Student';

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
      className = 'Not Assigned',
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
      motherName,
      motherMobile,
      address,
      currentCourse,
      batchDays,
      batchTime,
      courseDurationMonths = 12,
      artTeacher,
      vanFacility = false,
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

    student.fullName = fullName;
    student.email = email;
    student.badgeId = badgeId;
    student.className = className;
    student.phone = phone;
    student.photo = photo;
    student.dob = dob;
    student.age = age;
    student.bloodGroup = bloodGroup;
    student.gender = gender;
    student.school = school;
    student.college = college;
    student.occupation = occupation;
    student.fatherName = fatherName;
    student.fatherMobile = fatherMobile;
    student.motherName = motherName;
    student.motherMobile = motherMobile;
    student.address = address;
    student.currentCourse = currentCourse;
    student.batchDays = batchDays;
    student.batchTime = batchTime;
    student.courseDurationMonths = courseDurationMonths;
    student.artTeacher = artTeacher;
    student.vanFacility = vanFacility;
    student.feeStatus = feeStatus;

    await student.save();

    return NextResponse.json({
      message: 'Student updated successfully',
      student: {
        id: student._id.toString(),
        name: student.fullName,
        email: student.email,
        badgeId: student.badgeId,
        class: student.className,
        feeStatus: student.feeStatus,
        phone: student.phone,
        photo: student.photo,
        parentName: student.parentName,
        dob: student.dob,
        age: student.age,
        bloodGroup: student.bloodGroup,
        gender: student.gender,
        school: student.school,
        college: student.college,
        occupation: student.occupation,
        fatherName: student.fatherName,
        fatherMobile: student.fatherMobile,
        motherName: student.motherName,
        motherMobile: student.motherMobile,
        address: student.address,
        currentCourse: student.currentCourse,
        batchDays: student.batchDays,
        batchTime: student.batchTime,
        courseDurationMonths: student.courseDurationMonths,
        artTeacher: student.artTeacher,
        vanFacility: student.vanFacility,
        createdAt: student.createdAt,
      },
    });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
