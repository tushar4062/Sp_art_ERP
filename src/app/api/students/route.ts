import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import StudentCredentials from '@/lib/models/StudentCredentials';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const url = new URL(request.url);
    const className = url.searchParams.get('class');
    const feeStatus = url.searchParams.get('feeStatus');

    const filter: Record<string, unknown> = {};
    
    if (className && className !== 'All') {
      filter.className = className;
    }
    
    if (feeStatus && feeStatus !== 'All') {
      filter.feeStatus = feeStatus;
    }

    const students = await Student.find(filter).sort({ createdAt: -1 });
    const credentials = await StudentCredentials.find({ role: 'Student' }).sort({ createdAt: -1 });

    const existingBadges = new Set(students.map(s => s.badgeId));
    const existingEmails = new Set(students.filter(s => s.email).map(s => s.email));

    const credentialStudents = credentials
      .filter(c => {
        const badge = c.studentIdNumber?.trim() || c.studentId;
        return !existingBadges.has(badge) && !existingEmails.has(c.email);
      })
      .map(doc => ({
        id: doc._id.toString(),
        name: doc.name,
        email: doc.email,
        badgeId: doc.studentIdNumber?.trim() || doc.studentId,
        class: 'Not Assigned',
        feeStatus: 'Pending',
        phone: doc.mobileNumber,
        photo: undefined,
        parentName: undefined,
        dob: undefined,
        age: undefined,
        bloodGroup: undefined,
        gender: undefined,
        school: undefined,
        college: undefined,
        occupation: undefined,
        fatherName: undefined,
        fatherMobile: undefined,
        motherName: undefined,
        motherMobile: undefined,
        address: undefined,
        currentCourse: undefined,
        batchDays: undefined,
        batchTime: undefined,
        courseDurationMonths: undefined,
        artTeacher: undefined,
        vanFacility: undefined,
        createdAt: doc.createdAt,
      }));

    return NextResponse.json({
      students: [...students.map(doc => ({
        id: doc._id.toString(),
        name: doc.fullName,
        email: doc.email,
        badgeId: doc.badgeId,
        class: doc.className,
        feeStatus: doc.feeStatus,
        phone: doc.phone,
        photo: doc.photo,
        parentName: doc.parentName,
        dob: doc.dob,
        age: doc.age,
        bloodGroup: doc.bloodGroup,
        gender: doc.gender,
        school: doc.school,
        college: doc.college,
        occupation: doc.occupation,
        fatherName: doc.fatherName,
        fatherMobile: doc.fatherMobile,
        motherName: doc.motherName,
        motherMobile: doc.motherMobile,
        address: doc.address,
        currentCourse: doc.currentCourse,
        batchDays: doc.batchDays,
        batchTime: doc.batchTime,
        courseDurationMonths: doc.courseDurationMonths,
        artTeacher: doc.artTeacher,
        vanFacility: doc.vanFacility,
        createdAt: doc.createdAt,
      })), ...credentialStudents],
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
      parentName,
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

    // Check if student with same badge ID already exists
    const existingStudent = await Student.findOne({ badgeId });
    if (existingStudent) {
      return NextResponse.json({ error: 'Badge ID already exists' }, { status: 409 });
    }

    const student = await Student.create({
      fullName,
      email,
      badgeId,
      className,
      phone,
      photo,
      parentName,
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
      courseDurationMonths,
      artTeacher,
      vanFacility,
      feeStatus,
    });

    return NextResponse.json(
      {
        message: 'Student created successfully',
        student: {
          id: student._id.toString(),
          name: student.fullName,
          email: student.email,
          badgeId: student.badgeId,
          class: student.className,
          feeStatus: student.feeStatus,
          phone: student.phone,
          createdAt: student.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
