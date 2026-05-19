import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Teacher from '@/lib/models/Teacher';

export const runtime = 'nodejs';

const generateBadgeId = () => {
  return `TCH-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
};

async function getUniqueBadgeId() {
  let badgeId = generateBadgeId();
  while (await Teacher.findOne({ badgeId })) {
    badgeId = generateBadgeId();
  }
  return badgeId;
}

export async function GET() {
  try {
    await dbConnect();
    const teachers = await Teacher.find().sort({ createdAt: -1 });
    return NextResponse.json({
      teachers: teachers.map((t) => ({
        id: t._id.toString(),
        badgeId: t.badgeId,
        photo: t.photo,
        fullName: t.fullName,
        email: t.email,
        phone: t.phone,
        dob: t.dob,
        age: t.age,
        gender: t.gender,
        bloodGroup: t.bloodGroup,
        schoolCollege: t.schoolCollege,
        parentGuardianDetails: t.parentGuardianDetails,
        address: t.address,
        className: t.className,
        currentSubjectCourse: t.currentSubjectCourse,
        experience: t.experience,
        batchDetails: t.batchDetails,
        specialization: t.specialization,
        role: t.role,
        status: t.status,
        classes: t.classes,
        isSenior: t.isSenior,
        qualification: t.qualification,
        joiningDate: t.joiningDate,
        salary: t.salary,
        bio: t.bio,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
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
      experience = 1,
      batchDetails,
      specialization,
      role,
      status = 'Active',
      classes = [],
      isSenior = false,
      qualification,
      joiningDate,
      salary,
      bio,
    } = body;

    if (!fullName || !email || !specialization) {
      return NextResponse.json({ error: 'Full name, email, and specialization are required' }, { status: 400 });
    }

    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const finalBadgeId = body.badgeId?.trim() || await getUniqueBadgeId();
    const teacher = await Teacher.create({
      fullName,
      badgeId: finalBadgeId,
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
      isSenior,
      qualification,
      joiningDate,
      salary,
      bio,
    });

    return NextResponse.json({
      message: 'Teacher created successfully',
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
        qualification: teacher.qualification,
        joiningDate: teacher.joiningDate,
        salary: teacher.salary,
        bio: teacher.bio,
        createdAt: teacher.createdAt,
        updatedAt: teacher.updatedAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating teacher:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
